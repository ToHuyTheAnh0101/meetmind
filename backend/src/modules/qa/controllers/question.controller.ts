import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { QuestionService } from '../services/question.service';
import { MeetingQuestion } from '../entities/meeting-question.entity';
import { MeetingAnswer } from '../entities/meeting-answer.entity';
import { CreateQuestionDto, CreateAnswerDto } from '../dto/create-question.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('meetings/:meetingId/qa')
export class QuestionController {
  constructor(private questionService: QuestionService) {}

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
    return this.questionService.create(meetingId, {
      ...dto,
      askedByUserId: req.user.id,
    });
  }

  @Post(':id/answers')
  @UseGuards(JwtAuthGuard)
  async createAnswer(
    @Param('id') id: string,
    @Body() dto: CreateAnswerDto,
    @Request() req: { user: { id: string } },
  ): Promise<MeetingAnswer> {
    if (!dto.content) {
      throw new BadRequestException('Content is required');
    }
    return this.questionService.createAnswer(id, dto.content, req.user.id);
  }
}
