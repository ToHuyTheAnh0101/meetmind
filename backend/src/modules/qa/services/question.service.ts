import { Injectable, NotFoundException } from '@nestjs/common';
import {
  MeetingQuestion,
  QuestionStatus,
  QuestionType,
} from '../entities/meeting-question.entity';
import { MeetingAnswer } from '../entities/meeting-answer.entity';
import { QuestionRepository } from '../repositories/question.repository';
import { MeetingSessionRepository } from '../../meetings/repositories/meeting-session.repository';
import { MeetingSessionsService } from '../../meetings/services/meeting-sessions.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class QuestionService {
  constructor(
    private questionRepository: QuestionRepository,
    private sessionRepository: MeetingSessionRepository,
    private sessionsService: MeetingSessionsService,
    @InjectRepository(MeetingAnswer)
    private answerRepository: Repository<MeetingAnswer>,
  ) {}

  async create(
    meetingId: string,
    data: Partial<MeetingQuestion>,
  ): Promise<MeetingQuestion> {
    // Auto-ensure session exists (will create if needed)
    const session =
      await this.sessionsService.ensureSessionForMeeting(meetingId);

    const question = this.questionRepository.create({
      ...data,
      sessionId: session.id,
      meetingId: session.meetingId,
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

  async findBySessionId(sessionId: string): Promise<MeetingQuestion[]> {
    const questions = await this.questionRepository.findBySessionId(sessionId);

    // Everyone can see all discussion (host_qa) questions
    // In this new flow, we primarily care about host_qa
    return questions.filter((q) => q.type === QuestionType.HOST_QA);
  }

  async findByMeetingId(meetingId: string): Promise<MeetingQuestion[]> {
    const questions = await this.questionRepository.findByMeetingId(meetingId);
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
