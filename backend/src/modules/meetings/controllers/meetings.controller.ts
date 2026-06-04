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
  Logger,
  Res,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as express from 'express';
import { MeetingSessionsService } from '../services/meeting-sessions.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { MeetingsService } from '../services/meetings.service';
import { LiveKitService } from '../../../providers/livekit/livekit.service';
import { Meeting } from '../entities';
import { CreateMeetingDto } from '../dto/create-meeting.dto';
import { UpdateMeetingDto } from '../dto/update-meeting.dto';
import { ListMeetingsDto } from '../dto/list-meetings.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

interface RequestWithUser {
  user: {
    id: string;
    email: string;
  };
}

@Controller('meetings')
export class MeetingsController {
  private readonly logger = new Logger(MeetingsController.name);

  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly liveKitService: LiveKitService,
    private readonly sessionsService: MeetingSessionsService,
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
  async findOne(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<Meeting> {
    return this.meetingsService.findOneWithAccess(
      id,
      req.user.id,
      req.user.email,
    );
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
    @Body('sessionId') sessionId: string,
    @Request() req: { user: { id: string } },
  ): Promise<{ answer: string }> {
    return this.meetingsService.chatWithAI(
      id,
      question,
      req.user.id,
      sessionId,
    );
  }

  @Post(':id/chat/stream')
  @UseGuards(JwtAuthGuard)
  async chatWithAIStream(
    @Param('id') id: string,
    @Body('question') question: string,
    @Body('sessionId') sessionId: string,
    @Request() req: RequestWithUser,
    @Res() res: express.Response,
  ): Promise<void> {
    if (sessionId) {
      const hasAccess = await this.sessionsService.checkSessionAccess(
        sessionId,
        req.user.id,
        req.user.email,
      );
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this session');
      }
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await this.meetingsService.chatWithAIStream(
      id,
      question,
      req.user.id,
      sessionId,
    );

    const subscription = stream.subscribe({
      next: (chunk) => {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      },
      error: (err: unknown) => {
        const errorMsg = err instanceof Error ? err.message : String(err);
        res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
        res.end();
      },
      complete: () => {
        res.write('data: [DONE]\n\n');
        res.end();
      },
    });

    res.on('close', () => {
      subscription.unsubscribe();
    });
  }

  @Get(':id/chat/history')
  @UseGuards(JwtAuthGuard)
  async getAIChatHistory(
    @Param('id') id: string,
    @Query('sessionId') sessionId: string,
    @Request() req: RequestWithUser,
  ): Promise<any[]> {
    if (sessionId) {
      const hasAccess = await this.sessionsService.checkSessionAccess(
        sessionId,
        req.user.id,
        req.user.email,
      );
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this session');
      }
    }
    return this.meetingsService.getAIChatHistory(id, req.user.id, sessionId);
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

        this.logger.log(
          `LiveKit Egress Ended for room ${meetingId}. Audio saved at: ${location}`,
        );
      }
    }

    return { status: 'ok' };
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

  @Post(':id/screen-captures')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  async uploadScreenCapture(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Body('timestamp') timestampStr: string,
    @Body('sessionId') sessionId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    const timestamp = parseFloat(timestampStr);
    if (isNaN(timestamp)) {
      throw new BadRequestException('Invalid timestamp format');
    }

    return await this.meetingsService.saveScreenCapture(
      id,
      file,
      timestamp,
      sessionId,
    );
  }

  @Get(':id/screen-captures/:filename')
  getScreenCapture(
    @Param('id') id: string,
    @Param('filename') filename: string,
    @Res() res: express.Response,
  ) {
    const filePath = path.join(
      process.cwd(),
      'uploads',
      'captures',
      id,
      filename,
    );
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Screen capture not found');
    }
    res.sendFile(filePath);
  }
}
