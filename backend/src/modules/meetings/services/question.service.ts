import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { MeetingQuestion } from '../entities';
import { QuestionRepository } from '../repositories/question.repository';
import { MeetingRepository } from '../repositories/meeting.repository';

@Injectable()
export class QuestionService {
  constructor(
    private questionRepository: QuestionRepository,
    private meetingRepository: MeetingRepository,
  ) {}

  async create(meetingId: string, data: Partial<MeetingQuestion>): Promise<MeetingQuestion> {
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    const question = this.questionRepository.create({
      ...data,
      meetingId,
    });

    return this.questionRepository.save(question);
  }

  async findById(id: string): Promise<MeetingQuestion> {
    const question = await this.questionRepository.findById(id);
    if (!question) {
      throw new NotFoundException('Question not found');
    }
    return question;
  }

  async findByMeetingId(meetingId: string): Promise<MeetingQuestion[]> {
    return this.questionRepository.findByMeetingId(meetingId);
  }
}
