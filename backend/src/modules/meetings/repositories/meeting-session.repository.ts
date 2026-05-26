import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MeetingSession,
  MeetingSessionStatus,
} from '../entities/core/meeting-session.entity';

@Injectable()
export class MeetingSessionRepository {
  constructor(
    @InjectRepository(MeetingSession)
    private readonly repo: Repository<MeetingSession>,
  ) {}

  create(data: Partial<MeetingSession>): MeetingSession {
    return this.repo.create(data);
  }

  async save(session: Partial<MeetingSession>): Promise<MeetingSession> {
    return this.repo.save(session);
  }

  async findById(id: string): Promise<MeetingSession | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findActiveByMeeting(meetingId: string): Promise<MeetingSession | null> {
    return this.repo.findOne({
      where: { meetingId, status: MeetingSessionStatus.ONGOING },
    });
  }

  async findByMeetingId(meetingId: string): Promise<MeetingSession[]> {
    return this.repo.find({
      where: { meetingId },
      order: { actualStartTime: 'DESC' },
    });
  }
}
