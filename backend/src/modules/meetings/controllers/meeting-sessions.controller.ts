import { Controller, Post, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MeetingSessionsService } from '../services/meeting-sessions.service';

@Controller('meetings')
export class MeetingSessionsController {
  constructor(private readonly sessionsService: MeetingSessionsService) {}

  @Post(':id/sessions/start')
  @UseGuards(JwtAuthGuard)
  async startSession(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.sessionsService.startSession(id, req.user.id);
  }

  @Post(':id/sessions/:sessionId/end')
  @UseGuards(JwtAuthGuard)
  async endSession(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.sessionsService.endSession(id, sessionId, req.user.id);
  }
}
