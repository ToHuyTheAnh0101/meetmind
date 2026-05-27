import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EventService } from '../services/event.service';
import { MeetingSessionsService } from '../../meetings/services/meeting-sessions.service';
import { MeetingEvent } from '../entities/meeting-event.entity';
import { CreateEventDto } from '../dto/create-event.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('meetings/:meetingId/events')
export class EventController {
  constructor(
    private eventService: EventService,
    private sessionsService: MeetingSessionsService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Param('meetingId') meetingId: string,
  ): Promise<MeetingEvent[]> {
    const session =
      await this.sessionsService.ensureSessionForMeeting(meetingId);
    return this.eventService.findBySessionId(session.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string): Promise<MeetingEvent> {
    return this.eventService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateEventDto,
    @Request() req: { user: { id: string } },
  ): Promise<MeetingEvent> {
    const session =
      await this.sessionsService.ensureSessionForMeeting(meetingId);
    return this.eventService.logEvent(session.id, dto.type, req.user.id);
  }
}
