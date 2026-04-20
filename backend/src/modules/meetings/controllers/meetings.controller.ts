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
} from '@nestjs/common';
import { MeetingsService } from '../services/meetings.service';
import { Meeting, Participant } from '../entities';
import { CreateMeetingDto } from '../dto/create-meeting.dto';
import { UpdateMeetingDto } from '../dto/update-meeting.dto';
import { ListMeetingsDto } from '../dto/list-meetings.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { JoinResponseDto } from '../dto/join-response.dto';
import { JoinMeetingDto } from '../dto/join-meeting.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('meetings')
export class MeetingsController {
  constructor(private meetingsService: MeetingsService) {}

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
    return this.meetingsService.joinMeeting(id, req.user.id, dto.password);
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

  @Get(':id/participants')
  @UseGuards(JwtAuthGuard)
  async getParticipants(@Param('id') id: string): Promise<Participant[]> {
    return this.meetingsService.getParticipants(id);
  }
}
