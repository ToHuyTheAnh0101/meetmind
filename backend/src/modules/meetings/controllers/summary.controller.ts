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
} from '@nestjs/common';
import { SummaryService } from '../services/summary.service';
import { Summary } from '../entities';
import { CreateSummaryDto } from '../dto/create-summary.dto';
import { UpdateSummaryDto } from '../dto/update-summary.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('meetings/:meetingId/summaries')
export class SummaryController {
  constructor(private summaryService: SummaryService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Param('meetingId') meetingId: string): Promise<Summary[]> {
    return this.summaryService.findByMeetingId(meetingId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string): Promise<Summary> {
    return this.summaryService.findById(id);
  }

  @Get('overall')
  @UseGuards(JwtAuthGuard)
  async getOverallSummary(
    @Param('meetingId') meetingId: string,
  ): Promise<Summary | null> {
    return this.summaryService.findOverallSummary(meetingId);
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
