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
import { FileInterceptor } from '@nestjs/platform-express';
import { MeetingsService } from '../services/meetings.service';
import { LiveKitService } from '../../../providers/livekit/livekit.service';
import { Meeting } from '../entities';
import { CreateMeetingDto } from '../dto/create-meeting.dto';
import { UpdateMeetingDto } from '../dto/update-meeting.dto';
import { ListMeetingsDto } from '../dto/list-meetings.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
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
    await this.cacheManager.del(`meeting_public:${id}`);
  }

  @Post(':id/end')
  @UseGuards(JwtAuthGuard)
  async endMeeting(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ): Promise<Meeting> {
    return this.meetingsService.endMeeting(id, req.user.id);
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

  @Post(':id/transcribe')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('audio'))
  async transcribeAndSave(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Body()
    body: {
      userId?: string;
      speakerName?: string;
      startTime?: string;
      endTime?: string;
      chunkIndex?: string;
    },
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('No audio file provided');
    }
    return await this.meetingsService.transcribeAndSave(id, file, body);
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
      10,
      'http://localhost:3001/room/demo-id-123',
      'meetmind2024',
    );

    return {
      message: `Đã gửi 2 email mẫu (Invitation + Reminder) tới ${email}`,
    };
  }
}
