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
import { Repository, EntityManager } from 'typeorm';
import {
  MeetingEvent,
  EventType,
} from '../../events/entities/meeting-event.entity';

@Injectable()
export class QuestionService {
  constructor(
    private questionRepository: QuestionRepository,
    private sessionRepository: MeetingSessionRepository,
    private sessionsService: MeetingSessionsService,
    @InjectRepository(MeetingAnswer)
    private answerRepository: Repository<MeetingAnswer>,
    private entityManager: EntityManager,
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

    // Log QA_OPENED event
    try {
      const newEvent = this.entityManager.create(MeetingEvent, {
        sessionId: session.id,
        type: EventType.QA_OPENED,
        triggeredByUserId: savedQuestion.askedByUserId,
        metadata: {
          questionId: savedQuestion.id,
          content: savedQuestion.content,
        },
      });
      await this.entityManager.save(MeetingEvent, newEvent);
    } catch (err) {
      console.error('Failed to log QA_OPENED event:', err);
    }

    return this.findById(savedQuestion.id!);
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
    await this.questionRepository.save({ id, status });
    return this.findById(id);
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
      await this.questionRepository.save({
        id: questionId,
        status: QuestionStatus.ANSWERED,
      });
    }

    return savedAnswer;
  }
}
