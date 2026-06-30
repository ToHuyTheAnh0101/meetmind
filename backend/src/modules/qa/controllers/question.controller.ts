import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { QuestionService } from '../services/question.service';
import { MeetingQuestion } from '../entities/meeting-question.entity';
import { MeetingAnswer } from '../entities/meeting-answer.entity';
import {
  CreateQuestionDto,
  CreateAnswerDto,
  UpdateQuestionDto,
} from '../dto/create-question.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('meetings/:meetingId/qa')
export class QuestionController {
  constructor(private questionService: QuestionService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Param('meetingId') meetingId: string,
    @Query('breakoutRoomId') breakoutRoomId: string,
    @Request() req: { user: { id: string } },
  ): Promise<MeetingQuestion[]> {
    return this.questionService.findByMeetingId(
      meetingId,
      breakoutRoomId,
      req.user.id,
    );
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

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('meetingId') meetingId: string,
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
    @Request() req: { user: { id: string } },
  ): Promise<MeetingQuestion> {
    return this.questionService.update(meetingId, id, req.user.id, dto);
  }
}
