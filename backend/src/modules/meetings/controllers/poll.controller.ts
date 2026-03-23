import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PollService } from '../services/poll.service';
import { MeetingPoll } from '../entities';
import { CreatePollDto } from '../dto/create-poll.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('meetings/:meetingId/polls')
export class PollController {
  constructor(private pollService: PollService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Param('meetingId') meetingId: string): Promise<MeetingPoll[]> {
    return this.pollService.findByMeetingId(meetingId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string): Promise<MeetingPoll> {
    return this.pollService.findById(id);
  }

  // @Post()
  // @UseGuards(JwtAuthGuard)
  // async create(
  //   @Param('meetingId') meetingId: string,
  //   @Body() dto: CreatePollDto,
  //   @Request() req,
  // ): Promise<MeetingPoll> {
  //   return this.pollService.create(meetingId, {
  //     ...dto,
  //     createdByUserId: req.user.id,
  //     options: dto.options.map((opt) => ({
  //       ...opt,
  //     })),
  //   });
  // }

  @Post(':id/vote')
  @UseGuards(JwtAuthGuard)
  async vote(
    @Param('id') id: string,
    @Body() { optionId }: { optionId: string },
  ): Promise<MeetingPoll> {
    return this.pollService.vote(id, optionId);
  }

  @Post(':id/close')
  @UseGuards(JwtAuthGuard)
  async close(@Param('id') id: string): Promise<MeetingPoll> {
    return this.pollService.close(id);
  }
}
