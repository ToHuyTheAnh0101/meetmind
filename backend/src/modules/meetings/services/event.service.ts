import { Injectable, NotFoundException } from '@nestjs/common';
import { MeetingEvent, EventType } from '../entities';
import { EventRepository } from '../repositories/event.repository';
import { MeetingRepository } from '../repositories/meeting.repository';

@Injectable()
export class EventService {
  constructor(
    private eventRepository: EventRepository,
    private meetingRepository: MeetingRepository,
  ) {}

  async create(meetingId: string, data: Partial<MeetingEvent>): Promise<MeetingEvent> {
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    const event = this.eventRepository.create({
      ...data,
      meetingId,
    });

    return this.eventRepository.save(event);
  }

  async findById(id: string): Promise<MeetingEvent> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  async findByMeetingId(meetingId: string): Promise<MeetingEvent[]> {
    return this.eventRepository.findByMeetingId(meetingId);
  }

  async logEvent(
    meetingId: string,
    type: EventType,
    triggeredByUserId: string,
  ): Promise<MeetingEvent> {
    return this.create(meetingId, {
      type,
      triggeredByUserId,
    });
  }
}
