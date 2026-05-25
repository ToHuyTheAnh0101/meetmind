import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { QuestionService } from '../services/question.service';
import {
  MeetingQuestion,
  QuestionStatus,
} from '../entities/meeting-question.entity';
import { MeetingAnswer } from '../entities/meeting-answer.entity';
import { MeetingPermission } from '../../meetings/entities';
import { CreateQuestionDto, CreateAnswerDto } from '../dto/create-question.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ParticipantRepository } from '../../meetings/repositories/participant.repository';

@Controller('meetings/:meetingId/qa')
export class QuestionController {
  constructor(
    private questionService: QuestionService,
    private participantRepository: ParticipantRepository,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Param('meetingId') meetingId: string,
  ): Promise<MeetingQuestion[]> {
    return this.questionService.findByMeetingId(meetingId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateQuestionDto,
    @Request() req: { user: { id: string } },
  ): Promise<MeetingQuestion> {
    const participant = await this.participantRepository.findByMeetingAndUser(
      meetingId,
      req.user.id,
    );

    const hasManagePrivilege =
      participant?.isOrganizer ||
      participant?.permissions.includes(MeetingPermission.MANAGE_QA);

    if (!hasManagePrivilege) {
      throw new ForbiddenException(
        'You do not have permission to create discussion questions',
      );
    }

    return this.questionService.create(meetingId, {
      ...dto,
      askedByUserId: req.user.id,
    });
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('meetingId') meetingId: string,
    @Param('id') id: string,
    @Body('status') status: QuestionStatus,
    @Request() req: { user: { id: string } },
  ): Promise<MeetingQuestion> {
    const participant = await this.participantRepository.findByMeetingAndUser(
      meetingId,
      req.user.id,
    );

    const hasManagePrivilege =
      participant?.isOrganizer ||
      participant?.permissions.includes(MeetingPermission.MANAGE_QA);

    if (!hasManagePrivilege) {
      throw new ForbiddenException(
        'You do not have permission to moderate questions',
      );
    }

    return this.questionService.updateStatus(id, status);
  }

  @Post(':id/answers')
  @UseGuards(JwtAuthGuard)
  async createAnswer(
    @Param('id') id: string,
    @Body() dto: CreateAnswerDto,
    @Request() req: { user: { id: string } },
  ): Promise<MeetingAnswer> {
    return this.questionService.createAnswer(id, dto.content, req.user.id);
  }
}
