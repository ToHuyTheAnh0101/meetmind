import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { QuestionService } from '../services/question.service';
import { MeetingQuestion } from '../entities';
import { CreateQuestionDto } from '../dto/create-question.dto';
import { AnswerQuestionDto } from '../dto/answer-question.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('meetings/:meetingId/qa')
export class QuestionController {
  constructor(private questionService: QuestionService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Param('meetingId') meetingId: string): Promise<MeetingQuestion[]> {
    return this.questionService.findByMeetingId(meetingId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string): Promise<MeetingQuestion> {
    return this.questionService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateQuestionDto,
    @Request() req,
  ): Promise<MeetingQuestion> {
    return this.questionService.create(meetingId, {
      ...dto,
      askedByUserId: req.user.id,
    });
  }
}
