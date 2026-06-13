import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetLog } from '../entities/meet-log.entity';

@Injectable()
export class MeetLogRepository {
  constructor(
    @InjectRepository(MeetLog)
    private readonly repo: Repository<MeetLog>,
  ) {}

  async findById(id: string): Promise<MeetLog | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['triggeredByUser'],
    });
  }

  async findByMeetingId(meetingId: string): Promise<MeetLog[]> {
    return this.repo.find({
      where: { meetingId },
      relations: ['triggeredByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  create(data: Partial<MeetLog>): MeetLog {
    return this.repo.create(data);
  }

  async save(log: Partial<MeetLog>): Promise<MeetLog> {
    return this.repo.save(log);
  }

  async remove(log: MeetLog): Promise<void> {
    await this.repo.remove(log);
  }
}
