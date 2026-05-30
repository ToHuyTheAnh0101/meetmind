import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import {
  Meeting,
  MeetingStatus,
  MeetingRecording,
  MeetingAccessType,
  ParticipantStatus,
  MeetingPermission,
  MeetingSessionStatus,
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
import { MeetingRecordingRepository } from '../repositories/meeting-recording.repository';
import { MeetingSessionRepository } from '../repositories/meeting-session.repository';
import { MailService } from '../../../providers/mail/mail.service';
import { AiService } from '../../../providers/ai/ai.service';

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
    private recordingRepository: MeetingRecordingRepository,
    private sessionRepository: MeetingSessionRepository,
    private liveKitService: LiveKitService,
    private usersService: UsersService,
    private configService: ConfigService,
    private aiService: AiService,
    private mailService: MailService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(dto: CreateMeetingDto, userId: string): Promise<Meeting> {
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
      startTime: new Date(dto.startTime),
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
      await this.liveKitService.createRoom(savedMeeting.id);
      savedMeeting.livekitRoomName = savedMeeting.id;
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
              savedMeeting.title,
              savedMeeting.startTime,
              joinUrl,
              savedMeeting.password,
            )
            .catch((err) =>
              this.logger.error(`Không thể gửi lời mời cho ${email}:`, err),
            );

          // 2. Lên lịch nhắc nhở (Reminder)
          if (savedMeeting.reminderMinutes > 0) {
            this.mailService
              .scheduleMeetingReminder(
                email,
                'Quý khách',
                savedMeeting.id,
                savedMeeting.title,
                savedMeeting.startTime,
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

    return this.findOne(savedMeeting.id);
  }

  async endMeeting(id: string, userId: string): Promise<Meeting> {
    const meeting = await this.findOne(id);

    if (meeting.organizerId !== userId) {
      throw new ForbiddenException(
        'Only the organizer can end the meeting for everyone',
      );
    }

    const now = new Date();

    // Reset meeting status to SCHEDULED so that the meeting link can be reused for future sessions
    meeting.status = MeetingStatus.SCHEDULED;
    meeting.endTime = null as unknown as Date;

    // End the active session if one exists
    const activeSession = await this.sessionRepository.findActiveByMeeting(id);
    if (activeSession) {
      activeSession.actualEndTime = now;
      activeSession.status = MeetingSessionStatus.COMPLETED;
      await this.sessionRepository.save(activeSession);

      // Clear session cache so a new session is auto-created next time
      const cacheKey = `session:${id}`;
      await this.cacheManager.del(cacheKey);
    }

    // Delete the room so all users are booted
    try {
      await this.liveKitService.deleteRoom(
        meeting.livekitRoomName || meeting.id,
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

    meeting.status = MeetingStatus.SCHEDULED;
    meeting.endTime = null as unknown as Date;

    const activeSession = await this.sessionRepository.findActiveByMeeting(id);
    if (activeSession) {
      activeSession.actualEndTime = new Date();
      activeSession.status = MeetingSessionStatus.COMPLETED;
      await this.sessionRepository.save(activeSession);

      // Clear session cache
      const cacheKey = `session:${id}`;
      await this.cacheManager.del(cacheKey);
    }

    try {
      await this.liveKitService.deleteRoom(
        meeting.livekitRoomName || meeting.id,
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

  async update(
    id: string,
    dto: UpdateMeetingDto,
    userId: string,
  ): Promise<Meeting> {
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
        if (updatedMeeting.reminderMinutes > 0) {
          this.mailService
            .scheduleMeetingReminder(
              email,
              'Quý khách',
              updatedMeeting.id,
              updatedMeeting.title,
              updatedMeeting.startTime,
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
              updatedMeeting.id,
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

  /**
   * Lưu thông tin file audio từ LiveKit vào bảng MeetingRecording
   */
  async saveAudioRecording(
    meetingId: string,
    participantIdentity: string,
    fileUrl: string,
    fileSize: number,
    duration: number = 0,
    startTime: number = 0,
  ): Promise<void> {
    try {
      const participant =
        await this.participantsRepository.findByMeetingAndUser(
          meetingId,
          participantIdentity,
        );

      const recording = new MeetingRecording();
      recording.meetingId = meetingId;
      recording.participantId = participant?.id || '';
      recording.fileUrl = fileUrl;
      recording.fileSize = fileSize;
      recording.duration = duration;
      recording.startTime = startTime;

      await this.recordingRepository.save(recording);
      this.logger.log(
        `Đã lưu bản ghi âm cho ${participantIdentity} tại ${fileUrl}`,
      );
    } catch (error) {
      this.logger.error(`Lỗi khi lưu bản ghi âm:`, error);
    }
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

    const transcriptChunks =
      await this.transcriptRepository.findByMeetingId(meetingId);
    const transcriptText = transcriptChunks.map((c) => c.content).join('\n');

    if (!transcriptText || !transcriptText.trim()) {
      return {
        answer: `Không có bản dịch thoại trực tiếp. Đây là cuộc họp "${meeting.title}" với mô tả: ${meeting.description || 'Không có mô tả'}.`,
      };
    }

    const answer = await this.aiService.answerQuestion(
      question,
      transcriptText,
    );
    return { answer };
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

    // 1. Tìm session để gắn chunk vào.
    //    Ưu tiên session ONGOING; nếu session vừa kết thúc (COMPLETED) thì
    //    fallback sang session mới nhất — chunk này chắc chắn thuộc về nó.
    let session = await this.sessionRepository.findActiveByMeeting(meetingId);
    if (!session) {
      session = await this.sessionRepository.findLatestByMeeting(meetingId);
    }
    if (!session) {
      this.logger.warn(
        `[STT Rejected] Chunk received for meeting ${meetingId} but no session exists at all. Discarding chunk.`,
      );
      throw new BadRequestException('No session found for this meeting');
    }

    if (session.status !== MeetingSessionStatus.ONGOING) {
      this.logger.log(
        `[STT] Session ${session.id} is ${session.status} — attaching late chunk to it anyway.`,
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
        const chunk = this.transcriptRepository.create({
          meetingId,
          sessionId: session.id,
          content: transcriptText.trim(),
          userId,
          speakerName,
          chunkIndex: chunkIndexNum,
          startTime: startTimeNum,
          endTime: endTimeNum,
        });

        await this.transcriptRepository.save(chunk);

        this.logger.log(
          `[Background STT] Saved transcript chunk for meeting ${meetingId} (User: ${speakerName || 'Unknown'}): ${transcriptText.slice(0, 50)}...`,
        );
      })
      .catch((err) => {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `[Background STT Error] Failed to transcribe for meeting ${meetingId}: ${errorMsg}`,
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
}
