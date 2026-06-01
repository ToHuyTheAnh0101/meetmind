import { Injectable, NotFoundException } from '@nestjs/common';
import { MeetingEvent, EventType } from '../entities/meeting-event.entity';
import { EventRepository } from '../repositories/event.repository';
import { MeetingSessionRepository } from '../../meetings/repositories/meeting-session.repository';
import { MeetingSessionsService } from '../../meetings/services/meeting-sessions.service';

@Injectable()
export class EventService {
  constructor(
    private eventRepository: EventRepository,
    private sessionRepository: MeetingSessionRepository,
    private sessionsService: MeetingSessionsService,
  ) {}

  async create(
    meetingId: string,
    data: Partial<MeetingEvent>,
  ): Promise<MeetingEvent> {
    // Auto-ensure session exists (will create if needed)
    const session =
      await this.sessionsService.ensureSessionForMeeting(meetingId);

    const event = this.eventRepository.create({
      ...data,
      sessionId: session.id,
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

  async findBySessionId(sessionId: string): Promise<MeetingEvent[]> {
    return this.eventRepository.findBySessionId(sessionId);
  }

  async logEvent(
    sessionId: string,
    type: EventType,
    triggeredByUserId: string,
    metadata?: Record<string, any>,
  ): Promise<MeetingEvent> {
    // Direct event creation from sessionId (no auto-create session)
    const event = this.eventRepository.create({
      sessionId,
      type,
      triggeredByUserId,
      metadata: metadata || undefined,
    });
    return this.eventRepository.save(event);
  }
}
