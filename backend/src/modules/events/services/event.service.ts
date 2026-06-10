import { Injectable, NotFoundException } from '@nestjs/common';
import { MeetingEvent, EventType } from '../entities/meeting-event.entity';
import { EventRepository } from '../repositories/event.repository';

@Injectable()
export class EventService {
  constructor(private eventRepository: EventRepository) {}

  async create(
    meetingId: string,
    data: Partial<MeetingEvent>,
  ): Promise<MeetingEvent> {
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
    metadata?: Record<string, any>,
  ): Promise<MeetingEvent> {
    const event = this.eventRepository.create({
      meetingId,
      type,
      triggeredByUserId,
      metadata: metadata || undefined,
    });
    return this.eventRepository.save(event);
  }
}
