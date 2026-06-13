import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { SummaryService } from '../services/summary.service';
import { Summary } from '../entities/summary.entity';
import { CreateSummaryDto } from '../dto/create-summary.dto';
import { UpdateSummaryDto } from '../dto/update-summary.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MeetingsService } from '../../meetings/services/meetings.service';
import { EntityManager } from 'typeorm';
import { MeetLog, LogType } from '../../meetlogs/entities/meet-log.entity';

interface RequestWithUser {
  user: {
    id: string;
    email: string;
  };
}

@Controller('meetings/:meetingId/summaries')
export class SummaryController {
  constructor(
    private summaryService: SummaryService,
    private meetingsService: MeetingsService,
    private readonly entityManager: EntityManager,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Param('meetingId') meetingId: string,
    @Request() req: RequestWithUser,
  ): Promise<Summary[]> {
    // Check if user has access to this meeting
    await this.meetingsService.findOneWithAccess(
      meetingId,
      req.user.id,
      req.user.email,
    );
    return this.summaryService.findByMeetingId(meetingId);
  }

  @Get('overall')
  @UseGuards(JwtAuthGuard)
  async getOverallSummary(
    @Param('meetingId') meetingId: string,
    @Request() req: RequestWithUser,
  ): Promise<Summary | null> {
    await this.meetingsService.findOneWithAccess(
      meetingId,
      req.user.id,
      req.user.email,
    );
    return this.summaryService.findOverallSummary(meetingId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('meetingId') meetingId: string,
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<Summary> {
    await this.meetingsService.findOneWithAccess(
      meetingId,
      req.user.id,
      req.user.email,
    );
    return this.summaryService.findById(id);
  }

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  async generate(
    @Param('meetingId') meetingId: string,
    @Body() body: { templateId?: string },
    @Request() req: RequestWithUser,
  ): Promise<Summary> {
    await this.meetingsService.findOneWithAccess(
      meetingId,
      req.user.id,
      req.user.email,
    );

    const summary = await this.summaryService.generateAiSummary(
      meetingId,
      body?.templateId,
    );

    try {
      const newEvent = this.entityManager.create(MeetLog, {
        meetingId,
        type: LogType.AI_SUMMARY_GENERATED,
        triggeredByUserId: req.user.id,
        metadata: {
          templateId: body?.templateId || 'default',
          timestamp: new Date().toISOString(),
        },
      });
      await this.entityManager.save(MeetLog, newEvent);
    } catch (err) {
      console.error('Failed to log AI_SUMMARY_GENERATED event:', err);
    }

    return summary;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateSummaryDto,
    @Request() req: RequestWithUser,
  ): Promise<Summary> {
    await this.meetingsService.findOneWithAccess(
      meetingId,
      req.user.id,
      req.user.email,
    );
    return this.summaryService.create(meetingId, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('meetingId') meetingId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSummaryDto,
    @Request() req: RequestWithUser,
  ): Promise<Summary> {
    await this.meetingsService.findOneWithAccess(
      meetingId,
      req.user.id,
      req.user.email,
    );
    return this.summaryService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('meetingId') meetingId: string,
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    await this.meetingsService.findOneWithAccess(
      meetingId,
      req.user.id,
      req.user.email,
    );
    return this.summaryService.remove(id);
  }
}
