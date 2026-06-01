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
  ForbiddenException,
} from '@nestjs/common';
import { SummaryService } from '../services/summary.service';
import { Summary } from '../entities/summary.entity';
import { CreateSummaryDto } from '../dto/create-summary.dto';
import { UpdateSummaryDto } from '../dto/update-summary.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MeetingSessionsService } from '../../meetings/services/meeting-sessions.service';
import { EntityManager } from 'typeorm';
import {
  MeetingEvent,
  EventType,
} from '../../events/entities/meeting-event.entity';

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
    private sessionsService: MeetingSessionsService,
    private readonly entityManager: EntityManager,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Param('meetingId') meetingId: string,
    @Request() req: RequestWithUser,
  ): Promise<Summary[]> {
    const summaries = await this.summaryService.findByMeetingId(meetingId);
    const filtered: Summary[] = [];
    for (const summary of summaries) {
      if (!summary.sessionId) {
        filtered.push(summary);
        continue;
      }
      const hasAccess = await this.sessionsService.checkSessionAccess(
        summary.sessionId,
        req.user.id,
        req.user.email,
      );
      if (hasAccess) {
        filtered.push(summary);
      }
    }
    return filtered;
  }

  @Get('overall')
  @UseGuards(JwtAuthGuard)
  async getOverallSummary(
    @Param('meetingId') meetingId: string,
  ): Promise<Summary | null> {
    return this.summaryService.findOverallSummary(meetingId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string): Promise<Summary> {
    return this.summaryService.findById(id);
  }

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  async generate(
    @Param('meetingId') meetingId: string,
    @Body() body: { sessionId?: string; templateId?: string },
    @Request() req: RequestWithUser,
  ): Promise<Summary> {
    if (body?.sessionId) {
      const hasAccess = await this.sessionsService.checkSessionAccess(
        body.sessionId,
        req.user.id,
        req.user.email,
      );
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this session');
      }
    }

    const summary = await this.summaryService.generateAiSummary(
      meetingId,
      body?.sessionId,
      body?.templateId,
    );

    if (body?.sessionId) {
      try {
        const newEvent = this.entityManager.create(MeetingEvent, {
          sessionId: body.sessionId,
          type: EventType.AI_SUMMARY_GENERATED,
          triggeredByUserId: req.user.id,
          metadata: {
            templateId: body?.templateId || 'default',
            timestamp: new Date().toISOString(),
          },
        });
        await this.entityManager.save(MeetingEvent, newEvent);
      } catch (err) {
        console.error('Failed to log AI_SUMMARY_GENERATED event:', err);
      }
    }

    return summary;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateSummaryDto,
  ): Promise<Summary> {
    return this.summaryService.create(meetingId, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSummaryDto,
  ): Promise<Summary> {
    return this.summaryService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.summaryService.remove(id);
  }
}
