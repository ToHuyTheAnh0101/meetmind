import { Injectable, NotFoundException } from '@nestjs/common';
import { MeetLog, LogType } from '../entities/meet-log.entity';
import { MeetLogRepository } from '../repositories/meet-log.repository';

@Injectable()
export class MeetLogService {
  constructor(private meetLogRepository: MeetLogRepository) {}

  async create(meetingId: string, data: Partial<MeetLog>): Promise<MeetLog> {
    const log = this.meetLogRepository.create({
      ...data,
      meetingId,
    });

    return this.meetLogRepository.save(log);
  }

  async findById(id: string): Promise<MeetLog> {
    const log = await this.meetLogRepository.findById(id);
    if (!log) {
      throw new NotFoundException('Log not found');
    }
    return log;
  }

  async findByMeetingId(meetingId: string): Promise<MeetLog[]> {
    return this.meetLogRepository.findByMeetingId(meetingId);
  }

  async logEvent(
    meetingId: string,
    type: LogType,
    triggeredByUserId: string,
    metadata?: Record<string, any>,
  ): Promise<MeetLog> {
    const log = this.meetLogRepository.create({
      meetingId,
      type,
      triggeredByUserId,
      metadata: metadata || undefined,
    });
    return this.meetLogRepository.save(log);
  }
}
