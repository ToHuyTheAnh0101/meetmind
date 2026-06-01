import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MeetingSessionsService } from '../services/meeting-sessions.service';

interface RequestWithUser {
  user: {
    id: string;
    email: string;
  };
}

@Controller('meetings')
export class MeetingSessionsController {
  constructor(private readonly sessionsService: MeetingSessionsService) {}

  @Get(':id/sessions')
  @UseGuards(JwtAuthGuard)
  async getSessions(@Param('id') id: string) {
    return this.sessionsService.getSessionsByMeetingId(id);
  }

  @Post(':id/sessions/start')
  @UseGuards(JwtAuthGuard)
  async startSession(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.sessionsService.startSession(id, req.user.id);
  }

  @Post(':id/sessions/:sessionId/end')
  @UseGuards(JwtAuthGuard)
  async endSession(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.sessionsService.endSession(id, sessionId, req.user.id);
  }

  @Get(':id/sessions/:sessionId/shares')
  @UseGuards(JwtAuthGuard)
  async getShares(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
    @Request() req: RequestWithUser,
  ) {
    // Only participants or authorized users can view the list of shared users
    const hasAccess = await this.sessionsService.checkSessionAccess(
      sessionId,
      req.user.id,
      req.user.email,
    );
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this session');
    }

    return this.sessionsService.getSessionShares(id, sessionId);
  }

  @Post(':id/sessions/:sessionId/shares')
  @UseGuards(JwtAuthGuard)
  async addShare(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
    @Body('email') email: string,
    @Request() req: RequestWithUser,
  ) {
    const isAuthorized = await this.sessionsService.isOrganizerOrCoHost(
      id,
      req.user.id,
    );
    if (!isAuthorized) {
      throw new ForbiddenException(
        'Only organizer or co-host can share session access',
      );
    }

    return this.sessionsService.addSessionShare(sessionId, email);
  }

  @Delete(':id/sessions/:sessionId/shares/:shareId')
  @UseGuards(JwtAuthGuard)
  async removeShare(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
    @Param('shareId') shareId: string,
    @Request() req: RequestWithUser,
  ) {
    const isAuthorized = await this.sessionsService.isOrganizerOrCoHost(
      id,
      req.user.id,
    );
    if (!isAuthorized) {
      throw new ForbiddenException(
        'Only organizer or co-host can revoke session access',
      );
    }

    return this.sessionsService.removeSessionShare(shareId);
  }
}
