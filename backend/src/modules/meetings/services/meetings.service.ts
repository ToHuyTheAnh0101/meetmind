import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Observable, Subscription } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import {
  Meeting,
  MeetingStatus,
  MeetingAccessType,
  ParticipantStatus,
  MeetingPermission,
  ChatMessageType,
  ScreenCapture,
} from '../entities';
import { LiveKitService } from '../../../providers/livekit/livekit.service';
import { UsersService } from '../../users/users.service';
import { CreateMeetingDto } from '../dto/create-meeting.dto';
import { UpdateMeetingDto } from '../dto/update-meeting.dto';
import { ListMeetingsDto } from '../dto/list-meetings.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { PaginationHelper } from '../../../common/utils/pagination.helper';
import { MeetingRepository } from '../repositories/meeting.repository';
import { ParticipantRepository } from '../repositories/participant.repository';
import { TranscriptRepository } from '../repositories/transcript.repository';
import { MailService } from '../../../providers/mail/mail.service';
import { AiService } from '../../../providers/ai/ai.service.js';
import { ChatHistoryRepository } from '../repositories/chat-history.repository';
import { ScreenCaptureRepository } from '../repositories/screen-capture.repository';

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  // Track active background Speech-to-Text translation tasks: "meetingId:userId_chunkIndex"
  public activeTranscriptions = new Set<string>();

  hasActiveTranscriptions(meetingId: string): boolean {
    for (const key of this.activeTranscriptions) {
      if (key.startsWith(`${meetingId}:`)) {
        return true;
      }
    }
    return false;
  }
  constructor(
    private meetingsRepository: MeetingRepository,
    private participantsRepository: ParticipantRepository,
    private transcriptRepository: TranscriptRepository,
    private liveKitService: LiveKitService,
    private usersService: UsersService,
    private configService: ConfigService,
    private aiService: AiService,
    private mailService: MailService,
    private chatHistoryRepository: ChatHistoryRepository,
    private screenCaptureRepository: ScreenCaptureRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(dto: CreateMeetingDto, userId: string): Promise<Meeting> {
    if (dto.inviteeEmails && dto.inviteeEmails.length > 0) {
      for (const email of dto.inviteeEmails) {
        const user = await this.usersService.findByEmail(
          email.trim().toLowerCase(),
        );
        if (!user) {
          throw new BadRequestException(
            `Email "${email}" chưa đăng ký tài khoản trên hệ thống.`,
          );
        }
      }
    }

    const { password, ...meetingData } = dto;
    const hashedPassword = password; // Raw text

    const organizerPermissions = [
      MeetingPermission.EDIT_SUMMARY,
      MeetingPermission.CHAT_WITH_AI,
      MeetingPermission.UPDATE_PERMISSIONS,
      MeetingPermission.VIEW_TRANSCRIPT,
      MeetingPermission.DOWNLOAD_RECORDING,
      MeetingPermission.EDIT_MEETING_INFO,
      MeetingPermission.MANAGE_POLLS,
    ];

    const meeting = this.meetingsRepository.create({
      ...meetingData,
      password: hashedPassword,
      startTime: dto.startTime ? new Date(dto.startTime) : new Date(),
      organizerId: userId,
      // Default configurations if not provided
      accessType: dto.accessType || MeetingAccessType.PUBLIC,
      waitingRoomEnabled: dto.waitingRoomEnabled ?? false,
      muteOnJoin: dto.muteOnJoin ?? false,
      inviteeEmails: dto.inviteeEmails || [],
      reminderMinutes: dto.reminderMinutes ?? 10,
      participants: [
        this.participantsRepository.create({
          userId,
          isOrganizer: true,
          permissions: organizerPermissions,
          status: ParticipantStatus.ADMITTED,
        }),
      ],
    });

    const savedMeeting = await this.meetingsRepository.save(meeting);

    try {
      await this.liveKitService.createRoom(savedMeeting.id!);
      savedMeeting.livekitRoomName = savedMeeting.id!;
      await this.meetingsRepository.save(savedMeeting);

      // Gửi email mời họp và lên lịch nhắc nhở cho danh sách khách mời
      if (savedMeeting.inviteeEmails && savedMeeting.inviteeEmails.length > 0) {
        const frontendUrl =
          this.configService.get<string>('FRONTEND_URL') ||
          'http://localhost:3001';
        const joinUrl = `${frontendUrl}/room/${savedMeeting.id}`;

        for (const email of savedMeeting.inviteeEmails) {
          // 1. Gửi lời mời ngay lập tức
          this.mailService
            .sendMeetingInvitation(
              email,
              'Quý khách',
              savedMeeting.title || '',
              savedMeeting.startTime || new Date(),
              joinUrl,
              savedMeeting.password,
            )
            .catch((err) =>
              this.logger.error(`Không thể gửi lời mời cho ${email}:`, err),
            );

          // 2. Lên lịch nhắc nhở (Reminder)
          if (
            savedMeeting.reminderMinutes &&
            savedMeeting.reminderMinutes > 0
          ) {
            this.mailService
              .scheduleMeetingReminder(
                email,
                'Quý khách',
                savedMeeting.id!,
                savedMeeting.title || '',
                savedMeeting.startTime || new Date(),
                savedMeeting.reminderMinutes,
                joinUrl,
                savedMeeting.password,
              )
              .catch((err) =>
                this.logger.error(`Không thể lên lịch nhắc cho ${email}:`, err),
              );
          }
        }
      }
    } catch (error) {
      await this.meetingsRepository.remove(savedMeeting);
      throw error;
    }

    return this.findOne(savedMeeting.id!);
  }

  async endMeeting(id: string, userId: string): Promise<Meeting> {
    const meeting = await this.findOne(id);

    if (meeting.organizerId !== userId) {
      throw new ForbiddenException(
        'Only the organizer can end the meeting for everyone',
      );
    }

    const now = new Date();

    meeting.status = MeetingStatus.COMPLETED;
    meeting.actualEndTime = now;

    // Delete the room so all users are booted
    try {
      await this.liveKitService.deleteRoom(
        meeting.livekitRoomName || meeting.id || '',
      );
    } catch (err) {
      this.logger.warn(
        `Could not delete LiveKit room ${meeting.livekitRoomName}, might already be gone.`,
        err,
      );
    }

    // Cleanup raw recording chunks
    this.cleanupRecordings(id);

    return this.meetingsRepository.save(meeting);
  }

  /**
   * Called automatically when the last participant leaves and a grace period expires
   */
  async autoComplete(id: string): Promise<Meeting> {
    const meeting = await this.findOne(id);

    meeting.status = MeetingStatus.COMPLETED;
    meeting.actualEndTime = new Date();

    try {
      await this.liveKitService.deleteRoom(
        meeting.livekitRoomName || meeting.id || '',
      );
    } catch (err) {
      this.logger.warn(
        `Could not delete LiveKit room ${meeting.livekitRoomName}`,
        err,
      );
    }

    // Cleanup raw recording chunks
    this.cleanupRecordings(id);

    return this.meetingsRepository.save(meeting);
  }

  private cleanupRecordings(meetingId: string) {
    try {
      const dirPath = path.join(
        process.cwd(),
        'uploads',
        'recordings',
        meetingId,
      );
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        this.logger.log(
          `Cleaned up temporary recordings for meeting ${meetingId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to clean up recordings for meeting ${meetingId}:`,
        error,
      );
    }
  }

  async findAll(
    userId: string,
    queryDto?: ListMeetingsDto,
  ): Promise<PaginatedResult<Meeting>> {
    const { skip, take } = PaginationHelper.getSkipTake(
      queryDto || new ListMeetingsDto(),
    );

    const user = await this.usersService.findById(userId);
    const userEmail = user?.email;

    const [items, total] = await this.meetingsRepository.findAllForUser(
      userId,
      userEmail,
      skip,
      take,
      queryDto?.status,
      queryDto?.search,
    );

    return PaginationHelper.createPaginatedResult(
      items,
      total,
      queryDto || new ListMeetingsDto(),
    );
  }

  async findOne(id: string): Promise<Meeting> {
    const meeting = await this.meetingsRepository.findById(id);

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    return meeting;
  }

  async findOneWithAccess(
    id: string,
    userId: string,
    userEmail: string,
  ): Promise<Meeting> {
    const meeting = await this.meetingsRepository.findById(id);

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    const isOrganizer = meeting.organizerId === userId;
    const isInvited = (meeting.inviteeEmails || [])
      .map((e) => e.trim().toLowerCase())
      .includes(userEmail.trim().toLowerCase());

    const isParticipant = meeting.participants?.some(
      (p) => p.userId === userId,
    );

    if (!isOrganizer && !isInvited && !isParticipant) {
      const isShared = await this.meetingsRepository.hasSharedSession(
        id,
        userEmail,
      );
      if (!isShared) {
        throw new ForbiddenException(
          'You do not have permission to access this meeting details',
        );
      }
    }

    return meeting;
  }

  async update(
    id: string,
    dto: UpdateMeetingDto,
    userId: string,
  ): Promise<Meeting> {
    if (dto.inviteeEmails && dto.inviteeEmails.length > 0) {
      for (const email of dto.inviteeEmails) {
        const user = await this.usersService.findByEmail(
          email.trim().toLowerCase(),
        );
        if (!user) {
          throw new BadRequestException(
            `Email "${email}" chưa đăng ký tài khoản trên hệ thống.`,
          );
        }
      }
    }

    const meeting = await this.findOne(id);

    if (meeting.organizerId !== userId) {
      throw new ForbiddenException('Only organizer can update the meeting');
    }

    const { password, ...updateData } = dto;

    if (password !== undefined) {
      updateData['password'] = password;
    }

    Object.assign(meeting, {
      ...updateData,
      startTime: dto.startTime ? new Date(dto.startTime) : meeting.startTime,
    });

    const updatedMeeting = await this.meetingsRepository.save(meeting);

    // Cập nhật lại lịch nhắc nhở nếu có thay đổi liên quan
    if (
      dto.startTime ||
      dto.reminderMinutes !== undefined ||
      dto.inviteeEmails
    ) {
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3001';
      const joinUrl = `${frontendUrl}/room/${updatedMeeting.id}`;

      for (const email of updatedMeeting.inviteeEmails || []) {
        if (
          updatedMeeting.reminderMinutes &&
          updatedMeeting.reminderMinutes > 0
        ) {
          this.mailService
            .scheduleMeetingReminder(
              email,
              'Quý khách',
              updatedMeeting.id!,
              updatedMeeting.title || '',
              updatedMeeting.startTime || new Date(),
              updatedMeeting.reminderMinutes,
              joinUrl,
              updatedMeeting.password,
            )
            .catch((err) =>
              this.logger.error(
                `Không thể cập nhật lịch nhắc cho ${email}:`,
                err,
              ),
            );
        } else {
          // Nếu reminderMinutes = 0, hủy job nhắc lịch cũ
          try {
            await this.mailService.removeMeetingReminder(
              updatedMeeting.id!,
              email,
            );
          } catch (err) {
            this.logger.error(
              `Failed to remove meeting reminder for ${email}:`,
              err,
            );
          }
        }
      }
    }

    return updatedMeeting;
  }

  async remove(id: string, userId: string): Promise<void> {
    const meeting = await this.findOne(id);

    if (meeting.organizerId !== userId) {
      throw new ForbiddenException('Only organizer can delete the meeting');
    }

    await this.liveKitService.deleteRoom(meeting.livekitRoomName);
    await this.meetingsRepository.remove(meeting);
  }

  saveAudioRecording(
    meetingId: string,
    participantIdentity: string,
    fileUrl: string,
    fileSize: number,
    duration: number = 0,
    startTime: number = 0,
  ): Promise<void> {
    this.logger.log(
      `[Webhook Audio Egress] Nhận bản ghi âm cho ${participantIdentity} tại ${fileUrl}. Dung lượng: ${fileSize} bytes, Thời lượng: ${duration}s, Bắt đầu lúc: ${startTime}s. (Đã bỏ lưu database)`,
    );
    return Promise.resolve();
  }

  async checkConflict(userId: string, time: string, currentMeetingId?: string) {
    const checkTime = new Date(time);
    if (isNaN(checkTime.getTime())) {
      throw new BadRequestException('Invalid time format');
    }

    // Reset seconds and milliseconds to check by minute
    checkTime.setSeconds(0);
    checkTime.setMilliseconds(0);

    const nextMinute = new Date(checkTime.getTime() + 60000);

    const before = await this.meetingsRepository.findNearestBefore(
      userId,
      checkTime,
    );
    // For 'after', we want the first meeting that starts AFTER this minute window
    const after = await this.meetingsRepository.findNearestAfter(
      userId,
      nextMinute,
    );
    // For 'conflict', we want anything starting WITHIN this minute
    const exact = await this.meetingsRepository.findExactAt(userId, checkTime);

    const result = {
      before: before?.id === currentMeetingId ? null : before,
      after: after?.id === currentMeetingId ? null : after,
      conflict: exact?.id === currentMeetingId ? null : exact,
    };

    return result;
  }

  async chatWithAI(
    meetingId: string,
    question: string,
    _userId: string,
  ): Promise<{ answer: string }> {
    this.logger.log(`User ${_userId} chatting with AI in meeting ${meetingId}`);
    const meeting = await this.meetingsRepository.findById(meetingId);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    // 1. Tạo vector embedding cho câu hỏi
    const questionEmbedding = await this.aiService.embed(question);

    if (!questionEmbedding || questionEmbedding.length === 0) {
      throw new BadRequestException(
        'Failed to generate embedding for the question.',
      );
    }

    // 2. Tìm kiếm các đoạn transcript liên quan nhất theo embedding bằng pgvector trực tiếp ở DB
    // k=8 để có đủ candidates sau khi threshold lọc
    const relevantChunks =
      await this.transcriptRepository.findRelevantByEmbedding(
        meetingId,
        questionEmbedding,
        8,
      );

    // 3. Xử lý ngữ cảnh (context)
    let contextText = '';
    if (relevantChunks.length > 0) {
      contextText = relevantChunks
        .map((chunk) => {
          const speakerLabel = chunk.speakerName
            ? `${chunk.speakerName}: `
            : '';
          return `${speakerLabel}${chunk.content}`;
        })
        .join('\n');
    } else {
      // Fallback thông minh: không tải toàn bộ transcript mà chỉ lấy 25 chunks gần nhất
      // Tránh context quá dài làm AI bị overwhelm và tốn token
      this.logger.warn(
        `No relevant chunks found above threshold for meeting ${meetingId}. Using recent chunks fallback.`,
      );
      const recentChunks =
        await this.transcriptRepository.findRecentChunks(meetingId);
      contextText = recentChunks
        .map((c) =>
          c.speakerName ? `${c.speakerName}: ${c.content}` : c.content,
        )
        .join('\n');
    }

    // 4. Gọi Gemini API để trả lời câu hỏi dựa trên ngữ cảnh và lịch sử chat
    const answer = await this.aiService.answerQuestion(question, contextText);

    // 4.5. Tìm các screen capture liên quan trong khoảng thời gian của các relevantChunks
    const imageInfoList: Array<{ url: string; timestamp: number }> = [];
    if (relevantChunks.length > 0) {
      const timeRanges = relevantChunks
        .filter((c) => c.startTime !== undefined && c.startTime !== null)
        .map((c) => ({
          start: Math.max(0, c.startTime! - 5),
          end: (c.endTime || c.startTime!) + 15,
        }));

      if (timeRanges.length > 0) {
        try {
          const query = this.screenCaptureRepository
            .createQueryBuilder('capture')
            .where('capture.meetingId = :meetingId', { meetingId });

          const rangeConditions = timeRanges.map((range, index) => {
            return `(capture.timestamp BETWEEN :start${index} AND :end${index})`;
          });
          query.andWhere(`(${rangeConditions.join(' OR ')})`);

          timeRanges.forEach((range, index) => {
            query.setParameter(`start${index}`, range.start);
            query.setParameter(`end${index}`, range.end);
          });

          const captures = await query
            .orderBy('capture.timestamp', 'ASC')
            .getMany();
          const uniqueUrls = new Set<string>();
          for (const cap of captures) {
            if (!uniqueUrls.has(cap.imageUrl)) {
              uniqueUrls.add(cap.imageUrl);
              imageInfoList.push({
                url: cap.imageUrl,
                timestamp: cap.timestamp,
              });
            }
          }
        } catch (captureErr) {
          this.logger.error(
            'Failed to search related screen captures for RAG:',
            captureErr,
          );
        }
      }
    }

    let finalAnswer = answer;
    if (imageInfoList.length > 0) {
      finalAnswer +=
        '\n\n**Hình ảnh slide được nhắc đến:**\n' +
        imageInfoList
          .map(
            (img) => `![Slide tại ${Math.round(img.timestamp)}s](${img.url})`,
          )
          .join('\n');
    }

    // 5. Lưu lịch sử chat AI (cả câu hỏi của user và phản hồi của AI)
    try {
      await this.chatHistoryRepository.save({
        meetingId,
        userId: _userId,
        messageType: ChatMessageType.USER,
        content: question,
      });

      await this.chatHistoryRepository.save({
        meetingId,
        userId: _userId,
        messageType: ChatMessageType.AI,
        content: finalAnswer,
        metadata:
          imageInfoList.length > 0 ? { images: imageInfoList } : undefined,
      });
    } catch (dbError) {
      this.logger.error('Failed to save AI chat history:', dbError);
    }

    return { answer: finalAnswer };
  }

  async chatWithAIStream(
    meetingId: string,
    question: string,
    _userId: string,
  ): Promise<Observable<string>> {
    this.logger.log(
      `User ${_userId} chatting with AI (Stream) in meeting ${meetingId}`,
    );
    const meeting = await this.meetingsRepository.findById(meetingId);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    // 1. Tạo vector embedding cho câu hỏi
    const questionEmbedding = await this.aiService.embed(question);

    if (!questionEmbedding || questionEmbedding.length === 0) {
      throw new BadRequestException(
        'Failed to generate embedding for the question.',
      );
    }

    // 2. Tìm kiếm các đoạn transcript liên quan nhất theo embedding bằng pgvector trực tiếp ở DB
    // k=8 để có đủ candidates sau khi threshold lọc
    const relevantChunks =
      await this.transcriptRepository.findRelevantByEmbedding(
        meetingId,
        questionEmbedding,
        8,
      );

    // 3. Xử lý ngữ cảnh (context)
    let contextText = '';
    if (relevantChunks.length > 0) {
      contextText = relevantChunks
        .map((chunk) => {
          const speakerLabel = chunk.speakerName
            ? `${chunk.speakerName}: `
            : '';
          return `${speakerLabel}${chunk.content}`;
        })
        .join('\n');
    } else {
      // Fallback thông minh: không tải toàn bộ transcript mà chỉ lấy 25 chunks gần nhất
      // Tránh context quá dài làm AI bị overwhelm và tốn token
      this.logger.warn(
        `No relevant chunks found above threshold for meeting ${meetingId} (stream). Using recent chunks fallback.`,
      );
      const recentChunks =
        await this.transcriptRepository.findRecentChunks(meetingId);
      contextText = recentChunks
        .map((c) =>
          c.speakerName ? `${c.speakerName}: ${c.content}` : c.content,
        )
        .join('\n');
    }

    if (!contextText || !contextText.trim()) {
      this.logger.warn('Empty context for Gemini chat stream fallback');
      contextText = 'No transcript context found.';
    }

    return new Observable<string>((sub) => {
      let subscription: Subscription | undefined;

      this.aiService
        .answerQuestionStream(question, contextText)
        .then((geminiObs) => {
          let fullAnswer = '';

          subscription = geminiObs.subscribe({
            next: (chunk) => {
              fullAnswer += chunk;
              sub.next(chunk);
            },
            error: (err) => {
              sub.error(err);
            },
            complete: () => {
              void (async () => {
                // Fetch matching screen captures
                let markdownAppendix = '';
                const imageInfoList: Array<{ url: string; timestamp: number }> =
                  [];
                if (relevantChunks.length > 0) {
                  const timeRanges = relevantChunks
                    .filter(
                      (c) => c.startTime !== undefined && c.startTime !== null,
                    )
                    .map((c) => ({
                      start: Math.max(0, c.startTime! - 5),
                      end: (c.endTime || c.startTime!) + 15,
                    }));

                  if (timeRanges.length > 0) {
                    const query = this.screenCaptureRepository
                      .createQueryBuilder('capture')
                      .where('capture.meetingId = :meetingId', { meetingId });

                    const rangeConditions = timeRanges.map((range, index) => {
                      return `(capture.timestamp BETWEEN :start${index} AND :end${index})`;
                    });
                    query.andWhere(`(${rangeConditions.join(' OR ')})`);

                    timeRanges.forEach((range, index) => {
                      query.setParameter(`start${index}`, range.start);
                      query.setParameter(`end${index}`, range.end);
                    });

                    try {
                      const captures = await query
                        .orderBy('capture.timestamp', 'ASC')
                        .getMany();
                      const uniqueUrls = new Set<string>();
                      for (const cap of captures) {
                        if (!uniqueUrls.has(cap.imageUrl)) {
                          uniqueUrls.add(cap.imageUrl);
                          imageInfoList.push({
                            url: cap.imageUrl,
                            timestamp: cap.timestamp,
                          });
                        }
                      }
                    } catch (captureErr) {
                      this.logger.error(
                        'Failed to search related screen captures for RAG (stream completion):',
                        captureErr,
                      );
                    }
                  }
                }

                if (imageInfoList.length > 0) {
                  markdownAppendix =
                    '\n\n**Hình ảnh slide được nhắc đến:**\n' +
                    imageInfoList
                      .map(
                        (img) =>
                          `![Slide tại ${Math.round(img.timestamp)}s](${img.url})`,
                      )
                      .join('\n');
                }

                if (markdownAppendix) {
                  sub.next(markdownAppendix);
                  fullAnswer += markdownAppendix;
                }

                sub.complete();

                // 5. Lưu lịch sử chat AI (cả câu hỏi của user và phản hồi của AI) khi stream kết thúc
                try {
                  await this.chatHistoryRepository.save({
                    meetingId,
                    userId: _userId,
                    messageType: ChatMessageType.USER,
                    content: question,
                  });

                  await this.chatHistoryRepository.save({
                    meetingId,
                    userId: _userId,
                    messageType: ChatMessageType.AI,
                    content: fullAnswer,
                    metadata:
                      imageInfoList.length > 0
                        ? { images: imageInfoList }
                        : undefined,
                  });
                } catch (dbError) {
                  this.logger.error(
                    'Failed to save AI chat history in stream completion:',
                    dbError,
                  );
                }
              })();
            },
          });
        })
        .catch((err) => {
          sub.error(err);
        });

      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    });
  }

  async getAIChatHistory(meetingId: string, userId: string): Promise<any[]> {
    const meeting = await this.meetingsRepository.findById(meetingId);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    return this.chatHistoryRepository.findHistory(meetingId, userId);
  }

  /**
   * Dịch ngầm lát âm thanh và lưu trữ TranscriptChunk
   */
  async transcribeAndSave(
    meetingId: string,
    file: any,
    body?: {
      userId?: string;
      speakerName?: string;
      startTime?: string;
      endTime?: string;
      chunkIndex?: string;
    },
  ): Promise<any> {
    const meeting = await this.findOne(meetingId);
    if (!meeting) throw new NotFoundException('Meeting not found');

    if (!meeting.aiActivated) {
      this.logger.warn(
        `[STT Rejected] Chunk received for meeting ${meetingId} but AI is not activated. Discarding chunk.`,
      );
      throw new BadRequestException(
        'AI Assistant is not activated for this meeting',
      );
    }

    if (meeting.status !== MeetingStatus.ONGOING) {
      this.logger.log(
        `[STT] Meeting ${meetingId} is ${meeting.status} — attaching late chunk to it anyway.`,
      );
    }

    // 2. Lưu file ghi âm thô xuống đĩa cứng (uploads/recordings/[meetingId])
    const f = file as {
      originalname?: string;
      buffer?: Buffer | Uint8Array | string;
      mimetype?: string;
    };
    const buffer = Buffer.isBuffer(f.buffer)
      ? f.buffer
      : Buffer.from(f.buffer || '');
    const mimetype = typeof f.mimetype === 'string' ? f.mimetype : 'audio/webm';

    try {
      const dirPath = path.join(
        process.cwd(),
        'uploads',
        'recordings',
        meetingId,
      );
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      const userId = body?.userId || 'unknown';
      const chunkIndex =
        body?.chunkIndex !== undefined ? body.chunkIndex : Date.now();
      const fileName = `${userId}_chunk_${chunkIndex}.webm`;
      const filePath = path.join(dirPath, fileName);
      fs.writeFileSync(filePath, buffer);
      this.logger.log(`Saved raw recording chunk to: ${filePath}`);
    } catch (err) {
      this.logger.error(`Failed to save raw recording chunk:`, err);
    }

    // 3. Chuyển đổi âm thanh sang văn bản và lưu trữ DB dưới dạng BACKGROUND JOB bất đồng bộ ngầm
    const chunkIndexNum = body?.chunkIndex
      ? parseInt(body.chunkIndex, 10)
      : undefined;
    const startTimeNum = body?.startTime
      ? parseFloat(body.startTime)
      : undefined;
    const endTimeNum = body?.endTime ? parseFloat(body.endTime) : undefined;
    const userId = body?.userId || undefined;
    const speakerName = body?.speakerName || undefined;

    // Track this active transcription background task
    const userIdStr = userId || 'unknown';
    const chunkIndexStr = body?.chunkIndex || String(Date.now());
    const transcriptionKey = `${meetingId}:${userIdStr}_chunk_${chunkIndexStr}`;
    this.activeTranscriptions.add(transcriptionKey);

    this.aiService
      .transcribeAudio(buffer, mimetype)
      .then(async (transcriptText) => {
        if (!transcriptText || !transcriptText.trim()) {
          this.logger.log(
            `[Background STT] No speech detected for meeting ${meetingId}`,
          );
          return;
        }

        // 4. Lưu trữ TranscriptChunk vào cơ sở dữ liệu với metadata đầy đủ
        const cleanedTranscript = transcriptText.trim();
        const embedding = await this.aiService.embed(cleanedTranscript);

        const chunk = this.transcriptRepository.create({
          meetingId,
          content: cleanedTranscript,
          // Lưu null nếu mảng rỗng hoặc sai số chiều (không bằng 1024) để tránh lỗi pgvector DB crash
          embedding:
            embedding && embedding.length === 1024
              ? embedding
              : (null as unknown as number[]),
          userId,
          speakerName,
          chunkIndex: chunkIndexNum,
          startTime: startTimeNum,
          endTime: endTimeNum,
        });

        await this.transcriptRepository.save(chunk);

        this.logger.log(
          `[Background STT] Saved chunk ${chunkIndexNum} for user ${userIdStr} in meeting ${meetingId}`,
        );
      })
      .catch((err) => {
        this.logger.error(
          `[Background STT] Transcription failed for user ${userIdStr} in meeting ${meetingId}:`,
          err,
        );
      })
      .finally(() => {
        // Always remove the task from tracking set once completed or failed
        this.activeTranscriptions.delete(transcriptionKey);
      });

    // Trả về kết quả thành công lập tức cho client (Response cực kỳ nhanh < 50ms)
    return {
      success: true,
      message: 'Audio chunk successfully uploaded and queued for transcription',
    };
  }

  async saveScreenCapture(
    meetingId: string,
    file: any,
    timestamp: number,
  ): Promise<ScreenCapture> {
    const meeting = await this.meetingsRepository.findById(meetingId);
    if (!meeting) throw new NotFoundException('Meeting not found');

    // Check if AI Assistant is activated
    if (!meeting.aiActivated) {
      throw new BadRequestException(
        'AI Assistant is not activated. Screen capturing is disabled.',
      );
    }

    // Save the image file to the file system (uploads/captures/{meetingId}/)
    const f = file as {
      originalname?: string;
      buffer?: Buffer | Uint8Array | string;
      mimetype?: string;
    };
    const buffer = Buffer.isBuffer(f.buffer)
      ? f.buffer
      : Buffer.from(f.buffer || '');
    const mimetype = typeof f.mimetype === 'string' ? f.mimetype : 'image/jpeg';
    const ext = mimetype.includes('png') ? 'png' : 'jpg';

    let relativeUrl = '';
    try {
      const dirPath = path.join(
        process.cwd(),
        'uploads',
        'captures',
        meetingId,
      );
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const fileName = `capture_${Date.now()}.${ext}`;
      const filePath = path.join(dirPath, fileName);
      fs.writeFileSync(filePath, buffer);

      const backendUrl =
        this.configService.get<string>('BACKEND_URL') ||
        'http://localhost:3000';
      relativeUrl = `${backendUrl}/meetings/${meetingId}/screen-captures/${fileName}`;
      this.logger.log(`Saved screen capture to: ${filePath}`);
    } catch (err) {
      this.logger.error(`Failed to save screen capture:`, err);
      throw new BadRequestException('Failed to save screen capture file');
    }

    const capture = this.screenCaptureRepository.create({
      meetingId,
      imageUrl: relativeUrl,
      timestamp,
    });

    return await this.screenCaptureRepository.save(capture);
  }

  async getShares(meetingId: string): Promise<{
    defaultEmails: Array<{
      email: string;
      firstName: string | null;
      lastName: string | null;
      avatarUrl: string | null;
    }>;
    sharedShares: Array<{
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      avatarUrl: string | null;
      createdAt?: string;
    }>;
  }> {
    const meeting = await this.meetingsRepository.findById(meetingId);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    const defaultEmails: Array<{
      email: string;
      firstName: string | null;
      lastName: string | null;
      avatarUrl: string | null;
    }> = [];
    for (const email of meeting.inviteeEmails || []) {
      const user = await this.usersService.findByEmail(email);
      defaultEmails.push({
        email,
        firstName: user?.firstName || null,
        lastName: user?.lastName || null,
        avatarUrl: user?.picture || null,
      });
    }

    const sharedShares: Array<{
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      avatarUrl: string | null;
      createdAt?: string;
    }> = [];
    for (const email of meeting.sharedEmails || []) {
      const user = await this.usersService.findByEmail(email);
      sharedShares.push({
        id: email,
        email,
        firstName: user?.firstName || null,
        lastName: user?.lastName || null,
        avatarUrl: user?.picture || null,
      });
    }

    return { defaultEmails, sharedShares };
  }

  async addShare(
    meetingId: string,
    email: string,
    userId: string,
  ): Promise<any> {
    const meeting = await this.meetingsRepository.findById(meetingId);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    if (meeting.organizerId !== userId) {
      throw new ForbiddenException('Only the organizer can share this meeting');
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!meeting.sharedEmails) {
      meeting.sharedEmails = [];
    }
    if (!meeting.sharedEmails.includes(normalizedEmail)) {
      meeting.sharedEmails.push(normalizedEmail);
      await this.meetingsRepository.save(meeting);
    }

    const user = await this.usersService.findByEmail(normalizedEmail);
    return {
      id: normalizedEmail,
      email: normalizedEmail,
      firstName: user?.firstName || null,
      lastName: user?.lastName || null,
      avatarUrl: user?.picture || null,
    };
  }

  async removeShare(
    meetingId: string,
    email: string,
    userId: string,
  ): Promise<void> {
    const meeting = await this.meetingsRepository.findById(meetingId);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    if (meeting.organizerId !== userId) {
      throw new ForbiddenException('Only the organizer can manage shares');
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (meeting.sharedEmails) {
      meeting.sharedEmails = meeting.sharedEmails.filter(
        (e) => e.trim().toLowerCase() !== normalizedEmail,
      );
      await this.meetingsRepository.save(meeting);
    }
  }
}
