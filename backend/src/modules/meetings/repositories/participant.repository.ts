import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Participant } from '../entities';

@Injectable()
export class ParticipantRepository {
  constructor(
    @InjectRepository(Participant)
    private readonly repo: Repository<Participant>,
  ) {}

  create(data: Partial<Participant>): Participant {
    return this.repo.create(data);
  }

  async findByMeetingId(meetingId: string): Promise<Participant[]> {
    return this.repo.find({
      where: { meetingId },
      relations: ['user'],
    });
  }

  async findByMeetingAndUser(
    meetingId: string,
    userId: string,
  ): Promise<Participant | null> {
    return this.repo.findOne({
      where: { meetingId, userId },
      relations: ['user'],
    });
  }

  async save(
    participant: Participant | Partial<Participant>,
  ): Promise<Participant> {
    return this.repo.save(participant);
  }

  async remove(participant: Participant): Promise<void> {
    await this.repo.remove(participant);
  }
}
