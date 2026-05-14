import { Injectable, NotFoundException } from '@nestjs/common';
import { MeetingQuestion, MeetingAnswer } from '../entities';
import { QuestionRepository } from '../repositories/question.repository';
import { MeetingRepository } from '../repositories/meeting.repository';
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
      type: data.type || ('host_qa' as any), // Default to host_qa
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

  async findByMeetingId(
    meetingId: string,
    userId?: string,
    hasManagePrivilege: boolean = false,
  ): Promise<MeetingQuestion[]> {
    const questions = await this.questionRepository.findByMeetingId(meetingId);

    // Everyone can see all discussion (host_qa) questions
    // In this new flow, we primarily care about host_qa
    return questions.filter((q) => q.type === 'host_qa');
  }

  async upvote(id: string, userId: string): Promise<MeetingQuestion> {
    const question = await this.findById(id);
    const upvoterIds = question.upvoterIds || [];

    if (upvoterIds.includes(userId)) {
      // Remove upvote if already exists
      question.upvoterIds = upvoterIds.filter((id) => id !== userId);
    } else {
      question.upvoterIds = [...upvoterIds, userId];
    }

    return this.questionRepository.save(question);
  }

  async updateStatus(
    id: string,
    status: 'answered' | 'dismissed' | 'pending',
  ): Promise<MeetingQuestion> {
    const question = await this.findById(id);
    question.status = status as any;
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
    if (question.status === 'pending') {
      question.status = 'answered' as any;
      await this.questionRepository.save(question);
    }

    return savedAnswer;
  }
}
