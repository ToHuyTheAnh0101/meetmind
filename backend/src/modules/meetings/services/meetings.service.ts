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
import { EntityManager } from 'typeorm';
import { LogType } from '../../meetlogs/entities/meet-log.entity';
import { MeetLogService } from '../../meetlogs/services/meet-log.service';
import {
  Meeting,
  MeetingStatus,
  MeetingAccessType,
  ParticipantStatus,
  MeetingPermission,
  ScreenCapture,
  TranscriptChunk,
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
import { ScreenCaptureRepository } from '../repositories/screen-capture.repository';
import { CloudinaryService } from '../../../providers/cloudinary/cloudinary.service';

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
    private screenCaptureRepository: ScreenCaptureRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly entityManager: EntityManager,
    private cloudinaryService: CloudinaryService,
    private readonly meetLogService: MeetLogService,
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

    // Log MEETING_ENDED event
    try {
      await this.meetLogService.logEvent(id, LogType.MEETING_ENDED, userId, {
        timestamp: now.toISOString(),
      });
    } catch (err) {
      this.logger.error('Failed to log MEETING_ENDED event:', err);
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

    // Log MEETING_ENDED event (autoComplete)
    try {
      await this.meetLogService.logEvent(
        id,
        LogType.MEETING_ENDED,
        meeting.organizerId || '',
        {
          timestamp: new Date().toISOString(),
          autoCompleted: true,
        },
      );
    } catch (err) {
      this.logger.error(
        'Failed to log MEETING_ENDED event (autoComplete):',
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

    const oldAiActivated = meeting.aiActivated;
    const { password, ...updateData } = dto;

    if (password !== undefined) {
      updateData['password'] = password;
    }

    if (oldAiActivated === true && updateData.aiActivated === false) {
      updateData.aiActivated = true;
    }

    Object.assign(meeting, {
      ...updateData,
      startTime: dto.startTime ? new Date(dto.startTime) : meeting.startTime,
    });

    const updatedMeeting = await this.meetingsRepository.save(meeting);

    if (dto.aiActivated !== undefined && dto.aiActivated !== oldAiActivated) {
      try {
        await this.meetLogService.logEvent(
          id,
          dto.aiActivated
            ? LogType.AI_ASSISTANT_ACTIVATED
            : LogType.AI_ASSISTANT_DEACTIVATED,
          userId,
          {
            timestamp: new Date().toISOString(),
          },
        );
      } catch (err) {
        this.logger.error(
          `Failed to log AI assistant activation/deactivation event:`,
          err,
        );
      }
    }

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
      .transcribeAudio(buffer, mimetype, meeting.title, meeting.description)
      .then(async (transcriptText) => {
        if (!transcriptText || !transcriptText.trim()) {
          this.logger.log(
            `[Background STT] No speech detected for meeting ${meetingId}`,
          );
          return;
        }

        // 4. Lưu trữ TranscriptChunk vào cơ sở dữ liệu với metadata đầy đủ
        const cleanedTranscriptText = await this.aiService.cleanTranscriptChunk(
          transcriptText.trim(),
          meeting.title || 'Họp MeetMind',
          speakerName,
        );

        if (!cleanedTranscriptText || !cleanedTranscriptText.trim()) {
          this.logger.log(
            `[Background Clean STT] Cleaned transcript is empty for meeting ${meetingId}`,
          );
          return;
        }

        const cleanedTranscript = cleanedTranscriptText.trim();
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

    let imageUrl = '';

    if (this.cloudinaryService.hasCredentials()) {
      try {
        const publicId = `capture_${Date.now()}`;
        const folder = `meetmind/meetings/${meetingId}/captures`;
        imageUrl = await this.cloudinaryService.uploadImage(
          buffer,
          folder,
          publicId,
        );
        this.logger.log(`Uploaded screen capture to Cloudinary: ${imageUrl}`);
      } catch (err) {
        this.logger.error(
          'Failed to upload to Cloudinary, falling back to local storage:',
          err,
        );
      }
    }

    if (!imageUrl) {
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
        imageUrl = `${backendUrl}/meetings/${meetingId}/screen-captures/${fileName}`;
        this.logger.log(`Saved screen capture locally to: ${filePath}`);
      } catch (err) {
        this.logger.error(`Failed to save screen capture locally:`, err);
        throw new BadRequestException('Failed to save screen capture file');
      }
    }

    // Lưu record tạm vào DB (chưa có summary/embedding)
    const capture = this.screenCaptureRepository.create({
      meetingId,
      imageUrl,
      timestamp,
      summary: null,
      embedding: null,
    });
    const savedCapture = await this.screenCaptureRepository.save(capture);

    // Kích hoạt background job phân tích ảnh bằng Gemini Vision
    // Không await để phản hồi client ngay lập tức (< 50ms)
    this.analyzeAndEnrichCapture(savedCapture.id, buffer, mimetype).catch(
      (err) =>
        this.logger.error(
          `[BG Image Analysis] Failed for capture ${savedCapture.id}:`,
          err,
        ),
    );

    return savedCapture;
  }

  /**
   * Background job: Phân tích ảnh chụp màn hình bằng Gemini Vision.
   * Nếu ảnh có ý nghĩa (summary != null), tạo embedding và cập nhật DB.
   * Nếu là ảnh rác (summary == null), chỉ ghi log — giữ lại file để tham khảo.
   */
  private async analyzeAndEnrichCapture(
    captureId: string,
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<void> {
    this.logger.log(
      `[BG Image Analysis] Analyzing capture ${captureId} with Gemini Vision...`,
    );

    // 1. Gọi Gemini Vision để lấy summary
    const summary = await this.aiService.analyzeImage(imageBuffer, mimeType);

    if (!summary) {
      this.logger.log(
        `[BG Image Analysis] Capture ${captureId} identified as trash/empty screen. Skipping embedding.`,
      );
      return;
    }

    this.logger.log(
      `[BG Image Analysis] Capture ${captureId} is meaningful. Summary: "${summary.slice(0, 80)}..."`,
    );

    // 2. Tạo vector embedding từ summary
    let embedding: number[] | null = null;
    try {
      const rawEmbedding = await this.aiService.embed(summary);
      embedding =
        rawEmbedding && rawEmbedding.length === 1024 ? rawEmbedding : null;
    } catch (embedErr) {
      this.logger.error(
        `[BG Image Analysis] Failed to create embedding for capture ${captureId}:`,
        embedErr,
      );
    }

    // 3. Cập nhật record trong DB với summary và embedding
    await this.screenCaptureRepository.update(captureId, {
      summary,
      embedding,
    });

    this.logger.log(
      `[BG Image Analysis] Enriched capture ${captureId} with summary and embedding.`,
    );
  }

  /**
   * Hybrid retrieval cho screen captures trong RAG:
   * 1. Temporal: tìm ảnh trong khoảng thời gian của các transcript chunks liên quan.
   * 2. Semantic: tìm ảnh gần nhất theo vector embedding của câu hỏi.
   * Chỉ trả về ảnh có summary (!= null), tối đa MAX_IMAGE_RESULTS ảnh.
   */
  async findRelevantCaptures(
    meetingId: string,
    relevantChunks: TranscriptChunk[],
    questionEmbedding: number[],
    maxResults = 3,
  ): Promise<ScreenCapture[]> {
    const MAX_IMAGE_RESULTS = maxResults;
    const seenIds = new Set<string>();
    const results: ScreenCapture[] = [];

    // 1. Temporal: tìm ảnh trong khoảng timestamp của các chunks liên quan
    if (relevantChunks.length > 0) {
      const timeRanges = relevantChunks
        .filter((c) => c.startTime !== undefined && c.startTime !== null)
        .map((c) => ({
          start: Math.max(0, c.startTime! - 5),
          end: (c.endTime ?? c.startTime!) + 15,
        }));

      if (timeRanges.length > 0) {
        try {
          const query = this.screenCaptureRepository
            .createQueryBuilder('capture')
            .where('capture.meetingId = :meetingId', { meetingId })
            // Chỉ lấy ảnh đã được Gemini phân tích và có ý nghĩa
            .andWhere('capture.summary IS NOT NULL');

          const rangeConditions = timeRanges.map(
            (_, i) => `(capture.timestamp BETWEEN :start${i} AND :end${i})`,
          );
          query.andWhere(`(${rangeConditions.join(' OR ')})`);
          timeRanges.forEach((r, i) => {
            query.setParameter(`start${i}`, r.start);
            query.setParameter(`end${i}`, r.end);
          });

          const temporalCaptures = await query
            .orderBy('capture.timestamp', 'ASC')
            .getMany();

          for (const cap of temporalCaptures) {
            if (!seenIds.has(cap.id) && results.length < MAX_IMAGE_RESULTS) {
              seenIds.add(cap.id);
              results.push(cap);
            }
          }
        } catch (err) {
          this.logger.error(
            '[RAG] Failed temporal screen capture search:',
            err,
          );
        }
      }
    }

    // 2. Semantic: tìm ảnh gần nhất theo vector embedding của câu hỏi
    if (results.length < MAX_IMAGE_RESULTS && questionEmbedding.length > 0) {
      try {
        const semanticCaptures =
          await this.screenCaptureRepository.findRelevantByEmbedding(
            meetingId,
            questionEmbedding,
            MAX_IMAGE_RESULTS,
          );

        for (const cap of semanticCaptures) {
          if (!seenIds.has(cap.id) && results.length < MAX_IMAGE_RESULTS) {
            seenIds.add(cap.id);
            results.push(cap);
          }
        }
      } catch (err) {
        this.logger.error('[RAG] Failed semantic screen capture search:', err);
      }
    }

    // Sắp xếp kết quả theo thời gian tăng dần để hiển thị theo trình tự cuộc họ p
    results.sort((a, b) => a.timestamp - b.timestamp);
    return results;
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
