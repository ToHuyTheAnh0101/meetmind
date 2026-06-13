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
import { MeetLogService } from '../services/meet-log.service';
import { MeetLog } from '../entities/meet-log.entity';
import { CreateMeetLogDto } from '../dto/create-meet-log.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

interface RequestWithUser {
  user: {
    id: string;
    email: string;
  };
}

@Controller('meetings/:meetingId/logs')
export class MeetLogController {
  constructor(private meetLogService: MeetLogService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Param('meetingId') meetingId: string): Promise<MeetLog[]> {
    return this.meetLogService.findByMeetingId(meetingId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string): Promise<MeetLog> {
    return this.meetLogService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateMeetLogDto,
    @Request() req: RequestWithUser,
  ): Promise<MeetLog> {
    if (!dto.type) {
      throw new BadRequestException('Log type is required');
    }
    return this.meetLogService.logEvent(meetingId, dto.type, req.user.id);
  }
}
