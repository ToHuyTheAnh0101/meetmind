import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { MeetingQuestion } from '../entities/meeting-question.entity';
import { MeetingAnswer } from '../entities/meeting-answer.entity';
import { QuestionRepository } from '../repositories/question.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { BreakoutRoomParticipant } from '../../breakout-rooms/entities/breakout-room-participant.entity';
import { BreakoutRoomStatus } from '../../breakout-rooms/entities/breakout-room.entity';
import { MeetLog, LogType } from '../../meetlogs/entities/meet-log.entity';
import { MeetingPermission } from '../../meetings/entities';
import { ParticipantRepository } from '../../meetings/repositories/participant.repository';

@Injectable()
export class QuestionService {
  constructor(
    private questionRepository: QuestionRepository,
    @InjectRepository(MeetingAnswer)
    private answerRepository: Repository<MeetingAnswer>,
    private participantRepository: ParticipantRepository,
    private entityManager: EntityManager,
    @InjectRepository(BreakoutRoomParticipant)
    private readonly breakoutRoomParticipantRepo: Repository<BreakoutRoomParticipant>,
  ) {}

  private async resolveBreakoutRoomId(
    meetingId: string,
    userId: string,
    breakoutRoomId?: string,
  ): Promise<string | undefined> {
    if (!breakoutRoomId) return undefined;
    if (breakoutRoomId === 'current') {
      const assignment = await this.breakoutRoomParticipantRepo.findOne({
        where: {
          userId,
          breakoutRoom: {
            meetingId,
            status: BreakoutRoomStatus.ACTIVE,
          },
        },
        relations: ['breakoutRoom'],
      });
      return assignment?.breakoutRoomId || undefined;
    }
    return breakoutRoomId;
  }

  async create(
    meetingId: string,
    data: Partial<MeetingQuestion> & { breakoutRoomId?: string },
  ): Promise<MeetingQuestion> {
    const userId = data.askedByUserId;
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const participant = await this.participantRepository.findByMeetingAndUser(
      meetingId,
      userId,
    );
    if (
      !participant ||
      (!participant.isOrganizer &&
        !participant.permissions?.includes(MeetingPermission.MANAGE_QA) &&
        !participant.permissions?.includes(MeetingPermission.CO_HOST))
    ) {
      throw new ForbiddenException(
        'You do not have permission to ask questions in this meeting',
      );
    }

    const resolvedRoomId = await this.resolveBreakoutRoomId(
      meetingId,
      userId,
      data.breakoutRoomId,
    );

    const question = this.questionRepository.create({
      ...data,
      meetingId,
      breakoutRoomId: resolvedRoomId || undefined,
    });

    const savedQuestion = await this.questionRepository.save(question);

    try {
      const newEvent = this.entityManager.create(MeetLog, {
        meetingId,
        type: LogType.QA_OPENED,
        triggeredByUserId: savedQuestion.askedByUserId,
        metadata: {
          questionId: savedQuestion.id,
          content: savedQuestion.content,
        },
      });
      await this.entityManager.save(MeetLog, newEvent);
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

  async findByMeetingId(
    meetingId: string,
    breakoutRoomId?: string,
    userId?: string,
  ): Promise<MeetingQuestion[]> {
    const resolvedRoomId = userId
      ? await this.resolveBreakoutRoomId(meetingId, userId, breakoutRoomId)
      : breakoutRoomId;

    return this.questionRepository.findByMeetingId(meetingId, resolvedRoomId);
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

    return savedAnswer;
  }
}
