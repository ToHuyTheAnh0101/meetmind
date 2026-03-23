import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingEvent } from '../entities';

@Injectable()
export class EventRepository {
  constructor(
    @InjectRepository(MeetingEvent)
    private readonly repo: Repository<MeetingEvent>,
  ) {}

  async findById(id: string): Promise<MeetingEvent | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['triggeredByUser', 'agendaItem'],
    });
  }

  async findByMeetingId(meetingId: string): Promise<MeetingEvent[]> {
    return this.repo.find({
      where: { meetingId },
      relations: ['triggeredByUser', 'agendaItem'],
      order: { createdAt: 'DESC' },
    });
  }

  create(data: Partial<MeetingEvent>): MeetingEvent {
    return this.repo.create(data);
  }

  async save(event: Partial<MeetingEvent>): Promise<MeetingEvent> {
    return this.repo.save(event);
  }

  async remove(event: MeetingEvent): Promise<void> {
    await this.repo.remove(event);
  }
}
