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
import { Request as ExpressRequest } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { MeetingsService } from '../services/meetings.service';
import { LiveKitService } from '../../../providers/livekit/livekit.service';
import { Meeting, Participant } from '../entities';
import { CreateMeetingDto } from '../dto/create-meeting.dto';
import { UpdateMeetingDto } from '../dto/update-meeting.dto';
import { ListMeetingsDto } from '../dto/list-meetings.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { JoinResponseDto } from '../dto/join-response.dto';
import { JoinMeetingDto } from '../dto/join-meeting.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MailService } from '../../../providers/mail/mail.service';

@Controller('meetings')
export class MeetingsController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly liveKitService: LiveKitService,
    private readonly mailService: MailService,
  ) {}

  @Get(':id/public')
  async getMeetingPublicInfo(@Param('id') id: string): Promise<any> {
    // Public endpoint - no auth required
    // Shows meeting info before user joins
    const meeting = await this.meetingsService.findOne(id);
    return {
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
      createdAt: meeting.createdAt,
    };
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
    return this.meetingsService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ): Promise<void> {
    return this.meetingsService.remove(id, req.user.id);
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
    @Req() req: any,
  ) {
    const event = await this.liveKitService.receiveWebhook(
      req.rawBody || JSON.stringify(req.body),
      authHeader,
    );

    if (event.event === 'egress_ended') {
      const egressInfo = event.egressInfo as any;
      if (egressInfo && egressInfo.fileResults?.[0]) {
        const meetingId = egressInfo.roomName;
        const fileResult = egressInfo.fileResults[0];
        const participantIdentity = egressInfo.participantIdentity;

        // Lưu thông tin bản ghi âm vào DB
        await this.meetingsService.saveAudioRecording(
          meetingId,
          participantIdentity,
          fileResult.location,
          Number(fileResult.size),
          Number(fileResult.duration) / 1000000000, // Chuyển từ nano giây sang giây
          egressInfo.startedAt ? Number(egressInfo.startedAt) / 1000000000 : 0,
        );

        console.log(
          `LiveKit Egress Ended for room ${meetingId}. Audio saved at: ${fileResult.location}`,
        );
      }
    }

    return { status: 'ok' };
  }

  @Post(':id/test-transcribe')
  @UseInterceptors(FileInterceptor('audio'))
  async testTranscribe(@Param('id') id: string, @UploadedFile() file: any) {
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
      'http://localhost:3001/meetings/demo-id-123',
      'meetmind2024',
    );

    await this.mailService.sendMeetingReminder(
      email,
      'Thành viên Demo',
      '[Demo] Cuộc họp tổng kết Q2 - MeetMind',
      mockDate,
      'http://localhost:3001/meetings/demo-id-123',
      'meetmind2024',
    );

    return {
      message: `Đã gửi 2 email mẫu (Invitation + Reminder) tới ${email}`,
    };
  }
}
