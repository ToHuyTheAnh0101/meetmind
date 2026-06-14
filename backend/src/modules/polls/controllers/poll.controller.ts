import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { PollService } from '../services/poll.service';
import { PollResponseDto } from '../entities/meeting-poll.entity';
import { MeetingPoll } from '../entities/meeting-poll.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreatePollDto } from '../dto/create-poll.dto';

@Controller('meetings/:meetingId/polls')
export class PollController {
  constructor(private pollService: PollService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Param('meetingId') meetingId: string,
    @Query('breakoutRoomId') breakoutRoomId: string,
    @Request() req: { user: { id: string } },
  ): Promise<PollResponseDto[]> {
    return this.pollService.findByMeetingId(
      meetingId,
      breakoutRoomId,
      req.user.id,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string): Promise<PollResponseDto> {
    return this.pollService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('meetingId') meetingId: string,
    @Body() dto: CreatePollDto,
    @Request() req: { user: { id: string } },
  ): Promise<PollResponseDto> {
    return this.pollService.create(
      meetingId,
      req.user.id,
      dto as Partial<MeetingPoll>,
    );
  }

  @Post(':id/vote')
  @UseGuards(JwtAuthGuard)
  async vote(
    @Param('id') id: string,
    @Body() { optionId }: { optionId: string },
    @Request() req: { user: { id: string } },
  ): Promise<PollResponseDto> {
    return this.pollService.vote(id, req.user.id, optionId);
  }

  @Post(':id/close')
  @UseGuards(JwtAuthGuard)
  async close(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ): Promise<PollResponseDto> {
    return this.pollService.close(id, req.user.id);
  }
}
