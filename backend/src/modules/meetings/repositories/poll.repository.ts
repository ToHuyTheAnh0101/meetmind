import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingPoll } from '../entities';

@Injectable()
export class PollRepository {
  constructor(
    @InjectRepository(MeetingPoll)
    private readonly repo: Repository<MeetingPoll>,
  ) {}

  async findById(id: string): Promise<MeetingPoll | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['createdByUser'],
    });
  }

  async findByMeetingId(meetingId: string): Promise<MeetingPoll[]> {
    return this.repo.find({
      where: { meetingId },
      relations: ['createdByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  create(data: Partial<MeetingPoll>): MeetingPoll {
    return this.repo.create(data);
  }

  async save(poll: Partial<MeetingPoll>): Promise<MeetingPoll> {
    return this.repo.save(poll);
  }

  async remove(poll: MeetingPoll): Promise<void> {
    await this.repo.remove(poll);
  }
}
