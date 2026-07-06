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
  Res,
  NotFoundException,
} from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as express from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { MeetingsService } from '../services/meetings.service';
import { MeetingsWebhookService } from '../services/meetings-webhook.service';
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
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly webhookService: MeetingsWebhookService,
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
      allowDisplayNameEdit: meeting.allowDisplayNameEdit,
      muteOnJoin: meeting.muteOnJoin,
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

  @Post('webhooks/livekit')
  async handleLiveKitWebhook(
    @Headers('authorization') authHeader: string,
    @Req() req: Request & { rawBody?: Buffer },
  ) {
    console.log(
      '[Webhook] rawBody type:',
      typeof req.rawBody,
      req.rawBody ? 'exists' : 'does not exist',
    );
    const payload = req.rawBody
      ? req.rawBody.toString('utf-8')
      : JSON.stringify(req.body);
    return this.webhookService.handleWebhook(payload, authHeader);
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
  ) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    const timestamp = parseFloat(timestampStr);
    if (isNaN(timestamp)) {
      throw new BadRequestException('Invalid timestamp format');
    }

    return await this.meetingsService.saveScreenCapture(id, file, timestamp);
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

  @Get(':id/shares')
  @UseGuards(JwtAuthGuard)
  async getShares(@Param('id') id: string): Promise<any> {
    return this.meetingsService.getShares(id);
  }

  @Post(':id/shares')
  @UseGuards(JwtAuthGuard)
  async addShare(
    @Param('id') id: string,
    @Body('email') email: string,
    @Request() req: { user: { id: string } },
  ): Promise<any> {
    return this.meetingsService.addShare(id, email, req.user.id);
  }

  @Delete(':id/shares/:email')
  @UseGuards(JwtAuthGuard)
  async removeShare(
    @Param('id') id: string,
    @Param('email') email: string,
    @Request() req: { user: { id: string } },
  ): Promise<void> {
    await this.meetingsService.removeShare(id, email, req.user.id);
  }
}
