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
import { MeetingEvent } from '../entities';
import { CreateEventDto } from '../dto/create-event.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('meetings/:meetingId/events')
export class EventController {
  constructor(private eventService: EventService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Param('meetingId') meetingId: string): Promise<MeetingEvent[]> {
    return this.eventService.findByMeetingId(meetingId);
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
    @Request() req,
  ): Promise<MeetingEvent> {
    return this.eventService.logEvent(
      meetingId,
      dto.type,
      req.user.id,
    );
  }
}
