import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { MeetingQuestion } from '../entities/meeting-question.entity';

@Injectable()
export class QuestionRepository {
  constructor(
    @InjectRepository(MeetingQuestion)
    private readonly repo: Repository<MeetingQuestion>,
  ) {}

  async findById(id: string): Promise<MeetingQuestion | null> {
    return this.repo.findOne({
      where: { id },
      relations: [
        'askedByUser',
        'askedByParticipant',
        'answers',
        'answers.answeredByUser',
        'answers.answeredByParticipant',
      ],
    });
  }

  async findByMeetingId(
    meetingId: string,
    breakoutRoomId?: string,
  ): Promise<MeetingQuestion[]> {
    return this.repo.find({
      where: {
        meetingId,
        breakoutRoomId: breakoutRoomId || IsNull(),
      },
      relations: [
        'askedByUser',
        'askedByParticipant',
        'answers',
        'answers.answeredByUser',
        'answers.answeredByParticipant',
      ],
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
