import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingQuestion } from '../entities';

@Injectable()
export class QuestionRepository {
  constructor(
    @InjectRepository(MeetingQuestion)
    private readonly repo: Repository<MeetingQuestion>,
  ) {}

  async findById(id: string): Promise<MeetingQuestion | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['askedByUser', 'answeredByUser'],
    });
  }

  async findByMeetingId(meetingId: string): Promise<MeetingQuestion[]> {
    return this.repo.find({
      where: { meetingId },
      relations: ['askedByUser', 'answeredByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  create(data: Partial<MeetingQuestion>): MeetingQuestion {
    return this.repo.create(data);
  }

  async save(question: Partial<MeetingQuestion>): Promise<MeetingQuestion> {
    return this.repo.save(question);
  }

  async remove(question: MeetingQuestion): Promise<void> {
    await this.repo.remove(question);
  }
}
