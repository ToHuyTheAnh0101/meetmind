import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
  Headers,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
// express Request import not needed
import { FileInterceptor } from '@nestjs/platform-express';
import { MeetingsService } from '../services/meetings.service';
import { LiveKitService } from '../../../providers/livekit/livekit.service';
import { Meeting, Participant, MeetingPermission } from '../entities';
import { CreateMeetingDto } from '../dto/create-meeting.dto';
import { UpdateMeetingDto } from '../dto/update-meeting.dto';
import { ListMeetingsDto } from '../dto/list-meetings.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { JoinResponseDto } from '../dto/join-response.dto';
import { JoinMeetingDto } from '../dto/join-meeting.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MailService } from '../../../providers/mail/mail.service';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Controller('meetings')
export class MeetingsController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly liveKitService: LiveKitService,
    private readonly mailService: MailService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get('check-conflict')
  @UseGuards(JwtAuthGuard)
  async checkConflict(
    @Query('time') time: string,
    @Query('currentMeetingId') currentMeetingId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.meetingsService.checkConflict(
      req.user.id,
      time,
      currentMeetingId,
    );
  }

  @Get(':id/public')
  async getMeetingPublicInfo(@Param('id') id: string): Promise<any> {
    const cacheKey = `meeting_public:${id}`;
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const meeting = await this.meetingsService.findOne(id);
    const publicInfo = {
      id: meeting.id,
      title: meeting.title,
      description: meeting.description,
      status: meeting.status,
      startTime: meeting.startTime,
      organizerName: meeting.organizer
        ? `${meeting.organizer.firstName} ${meeting.organizer.lastName}`
        : 'Unknown',
      participantCount: meeting.participants?.length || 0,
      hasPassword: !!meeting.password,
      organizerId: meeting.organizerId,
      isQaEnabled: meeting.isQaEnabled,
      isAnonymousAllowed: meeting.isAnonymousAllowed,
      createdAt: meeting.createdAt,
    };

    // Lưu vào cache trong 5 phút (300000ms)
    await this.cacheManager.set(cacheKey, publicInfo, 300000);
    return publicInfo;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() dto: CreateMeetingDto,
    @Request() req: { user: { id: string } },
  ): Promise<Meeting> {
    return this.meetingsService.create(dto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Request() req: { user: { id: string } },
    @Query() queryDto: ListMeetingsDto,
  ): Promise<PaginatedResult<Meeting>> {
    return this.meetingsService.findAll(req.user.id, queryDto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string): Promise<Meeting> {
    return this.meetingsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMeetingDto,
    @Request() req: { user: { id: string } },
  ): Promise<Meeting> {
    const result = await this.meetingsService.update(id, dto, req.user.id);
    // Xóa cache khi update
    await this.cacheManager.del(`meeting_public:${id}`);
    return result;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ): Promise<void> {
    await this.meetingsService.remove(id, req.user.id);
    // Xóa cache khi delete
    await this.cacheManager.del(`meeting_public:${id}`);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  async joinMeeting(
    @Param('id') id: string,
    @Body() dto: JoinMeetingDto,
    @Request() req: { user: { id: string } },
  ): Promise<JoinResponseDto> {
    return this.meetingsService.joinMeeting(
      id,
      req.user.id,
      dto.password,
      dto.displayName,
    );
  }

  @Post(':id/sessions/start')
  @UseGuards(JwtAuthGuard)
  async startSession(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.meetingsService.startSession(id, req.user.id);
  }

  @Post(':id/sessions/:sessionId/end')
  @UseGuards(JwtAuthGuard)
  async endSession(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.meetingsService.endSession(id, sessionId, req.user.id);
  }

  @Post(':id/chat')
  @UseGuards(JwtAuthGuard)
  async chatWithAI(
    @Param('id') id: string,
    @Body('question') question: string,
    @Request() req: { user: { id: string } },
  ): Promise<{ answer: string }> {
    return this.meetingsService.chatWithAI(id, question, req.user.id);
  }

  @Post(':id/end')
  @UseGuards(JwtAuthGuard)
  async endMeeting(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ): Promise<Meeting> {
    return this.meetingsService.endMeeting(id, req.user.id);
  }

  @Post(':id/admit/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async admitParticipant(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: { user: { id: string } },
  ): Promise<void> {
    return this.meetingsService.admitParticipant(id, userId, req.user.id);
  }

  @Post(':id/reject/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async rejectParticipant(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: { user: { id: string } },
  ): Promise<void> {
    return this.meetingsService.rejectParticipant(id, userId, req.user.id);
  }

  @Put(':id/participants/permissions/bulk')
  @UseGuards(JwtAuthGuard)
  async updateBulkParticipantsPermissions(
    @Param('id') id: string,
    @Body()
    dto: {
      userIds?: string[];
      action: 'grant' | 'revoke';
      permissions: MeetingPermission[];
    },
    @Request() req: { user: { id: string } },
  ): Promise<{ count: number }> {
    return this.meetingsService.updateBulkParticipantsPermissions(
      id,
      dto.userIds,
      dto.action,
      dto.permissions,
      req.user.id,
    );
  }

  @Put(':id/participants/:userId/permissions')
  @UseGuards(JwtAuthGuard)
  async updateParticipantPermissions(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body('permissions') permissions: MeetingPermission[],
    @Request() req: { user: { id: string } },
  ): Promise<Participant> {
    return this.meetingsService.updateParticipantPermissions(
      id,
      userId,
      permissions,
      req.user.id,
    );
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async leaveMeeting(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ): Promise<void> {
    return this.meetingsService.leaveMeeting(id, req.user.id);
  }

  @Get(':id/participants')
  @UseGuards(JwtAuthGuard)
  async getParticipants(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<any> {
    return this.meetingsService.getParticipants(id, page, limit);
  }

  @Post('webhooks/livekit')
  async handleLiveKitWebhook(
    @Headers('authorization') authHeader: string,
    @Req() req: Request & { rawBody?: string },
  ) {
    const payload = String(req.rawBody || JSON.stringify(req.body));
    const event = (await this.liveKitService.receiveWebhook(
      payload,
      authHeader,
    )) as Record<string, any>;

    if (event.event === 'egress_ended') {
      const egressInfo = event?.egressInfo as Record<string, any> | undefined;
      if (
        egressInfo &&
        Array.isArray(egressInfo.fileResults) &&
        egressInfo.fileResults.length > 0
      ) {
        const meetingId = String(egressInfo.roomName || '');
        const fileResult = egressInfo.fileResults[0] as Record<string, any>;
        const participantIdentity = String(
          egressInfo.participantIdentity || '',
        );

        const location = String(fileResult.location || '');
        const size = Number(fileResult.size || 0);
        const duration = Number(fileResult.duration || 0) / 1000000000;
        const startedAt = egressInfo.startedAt
          ? Number(egressInfo.startedAt) / 1000000000
          : 0;

        // Lưu thông tin bản ghi âm vào DB
        await this.meetingsService.saveAudioRecording(
          meetingId,
          participantIdentity,
          location,
          size,
          duration,
          startedAt,
        );

        console.log(
          `LiveKit Egress Ended for room ${meetingId}. Audio saved at: ${location}`,
        );
      }
    }

    return { status: 'ok' };
  }

  @Post(':id/test-transcribe')
  @UseInterceptors(FileInterceptor('audio'))
  async testTranscribe(
    @Param('id') id: string,
    @UploadedFile() file: any,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('No audio file provided');
    }
    return this.meetingsService.testTranscribe(id, file);
  }

  @Post('test-mail')
  async testMail(@Body('email') email: string) {
    const mockDate = new Date();
    mockDate.setMinutes(mockDate.getMinutes() + 30);

    await this.mailService.sendMeetingInvitation(
      email,
      'Thành viên Demo',
      '[Demo] Cuộc họp tổng kết Q2 - MeetMind',
      mockDate,
      'http://localhost:3001/room/demo-id-123',
      'meetmind2024',
    );

    await this.mailService.scheduleMeetingReminder(
      email,
      'Thành viên Demo',
      'demo-meeting-id',
      '[Demo] Cuộc họp tổng kết Q2 - MeetMind',
      mockDate,
      10, // Nhắc trước 10 phút
      'http://localhost:3001/room/demo-id-123',
      'meetmind2024',
    );

    return {
      message: `Đã gửi 2 email mẫu (Invitation + Reminder) tới ${email}`,
    };
  }
}
