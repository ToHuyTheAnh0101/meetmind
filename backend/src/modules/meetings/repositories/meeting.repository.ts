import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from '../entities';

@Injectable()
export class MeetingRepository {
  constructor(
    @InjectRepository(Meeting)
    private readonly repo: Repository<Meeting>,
  ) {}

  async findById(id: string): Promise<Meeting | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['participants', 'participants.user', 'organizer'],
    });
  }

  async findAllForUser(userId: string): Promise<Meeting[]> {
    return this.repo
      .createQueryBuilder('meeting')
      .leftJoinAndSelect('meeting.participants', 'participant')
      .leftJoinAndSelect('participant.user', 'user')
      .where('meeting.organizerId = :userId', { userId })
      .orWhere('participant.userId = :userId', { userId })
      .distinct(true)
      .getMany();
  }

  create(data: Partial<Meeting>): Meeting {
    return this.repo.create(data);
  }

  async save(meeting: Partial<Meeting>): Promise<Meeting> {
    return this.repo.save(meeting);
  }

  async remove(meeting: Meeting): Promise<void> {
    await this.repo.remove(meeting);
  }
}
