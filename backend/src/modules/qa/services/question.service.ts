import { Injectable, NotFoundException } from '@nestjs/common';
import {
  MeetingQuestion,
  QuestionStatus,
  QuestionType,
} from '../entities/meeting-question.entity';
import { MeetingAnswer } from '../entities/meeting-answer.entity';
import { QuestionRepository } from '../repositories/question.repository';
import { MeetingRepository } from '../../meetings/repositories/meeting.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class QuestionService {
  constructor(
    private questionRepository: QuestionRepository,
    private meetingRepository: MeetingRepository,
    @InjectRepository(MeetingAnswer)
    private answerRepository: Repository<MeetingAnswer>,
  ) {}

  async create(
    meetingId: string,
    data: Partial<MeetingQuestion>,
  ): Promise<MeetingQuestion> {
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    const question = this.questionRepository.create({
      ...data,
      meetingId,
      type: data.type || QuestionType.HOST_QA,
      isAnonymous: false, // Discussion questions are never anonymous
    });

    const savedQuestion = await this.questionRepository.save(question);
    return this.findById(savedQuestion.id);
  }

  async findById(id: string): Promise<MeetingQuestion> {
    const question = await this.questionRepository.findById(id);
    if (!question) {
      throw new NotFoundException('Question not found');
    }
    return question;
  }

  async findByMeetingId(meetingId: string): Promise<MeetingQuestion[]> {
    const questions = await this.questionRepository.findByMeetingId(meetingId);

    // Everyone can see all discussion (host_qa) questions
    // In this new flow, we primarily care about host_qa
    return questions.filter((q) => q.type === QuestionType.HOST_QA);
  }

  async updateStatus(
    id: string,
    status: QuestionStatus,
  ): Promise<MeetingQuestion> {
    const question = await this.findById(id);
    question.status = status;
    return this.questionRepository.save(question);
  }

  async createAnswer(
    questionId: string,
    content: string,
    answeredByUserId: string,
  ): Promise<MeetingAnswer> {
    const question = await this.findById(questionId);
    const answer = this.answerRepository.create({
      meetingId: question.meetingId,
      questionId,
      content,
      answeredByUserId,
    });

    const savedAnswer = await this.answerRepository.save(answer);

    // Update question status if it was pending and answered by moderator
    if (question.status === QuestionStatus.PENDING) {
      question.status = QuestionStatus.ANSWERED;
      await this.questionRepository.save(question);
    }

    return savedAnswer;
  }
}
