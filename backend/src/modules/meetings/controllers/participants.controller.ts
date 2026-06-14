import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  ParticipantsService,
  LobbyEvent,
} from '../services/participants.service';
import { JoinMeetingDto } from '../dto/join-meeting.dto';
import { MeetingPermission } from '../entities';
import { Observable, concat, of } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@Controller('meetings')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  async joinMeeting(
    @Param('id') id: string,
    @Body() dto: JoinMeetingDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.participantsService.joinMeeting(
      id,
      req.user.id,
      dto.password,
      dto.displayName,
    );
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async leaveMeeting(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.participantsService.leaveMeeting(id, req.user.id);
  }

  @Get(':id/participants')
  @UseGuards(JwtAuthGuard)
  async getParticipants(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.participantsService.getParticipants(id, page, limit);
  }

  @Post(':id/admit/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async admitParticipant(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.participantsService.admitParticipant(id, userId, req.user.id);
  }

  @Post(':id/reject/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async rejectParticipant(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.participantsService.rejectParticipant(id, userId, req.user.id);
  }

  @Put(':id/participants/:userId/permissions')
  @UseGuards(JwtAuthGuard)
  async updateParticipantPermissions(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body('permissions') permissions: MeetingPermission[],
    @Request() req: { user: { id: string } },
  ) {
    return this.participantsService.updateParticipantPermissions(
      id,
      userId,
      permissions,
      req.user.id,
    );
  }

  @Put(':id/participants/permissions/bulk')
  @UseGuards(JwtAuthGuard)
  async updateBulkParticipantsPermissions(
    @Param('id') id: string,
    @Body()
    dto: {
      userIds?: string[];
      action: 'grant' | 'revoke';
      permissions: MeetingPermission[];
    },
    @Request() req: { user: { id: string } },
  ) {
    return this.participantsService.updateBulkParticipantsPermissions(
      id,
      dto.userIds,
      dto.action,
      dto.permissions,
      req.user.id,
    );
  }

  @Sse(':id/lobby/sse')
  @UseGuards(JwtAuthGuard)
  streamLobbyUpdates(@Param('id') id: string): Observable<MessageEvent> {
    return this.participantsService.getLobbyEventsObservable().pipe(
      filter(
        (event: LobbyEvent) =>
          event.meetingId === id && event.type === 'lobby_updated',
      ),
      map(() => ({ data: { type: 'lobby_updated' } }) as MessageEvent),
    );
  }

  @Sse(':id/participants/status-sse')
  @UseGuards(JwtAuthGuard)
  async streamParticipantStatus(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ): Promise<Observable<MessageEvent>> {
    const currentStatus = await this.participantsService.getParticipantStatus(
      id,
      req.user.id,
    );

    const initialEvent: MessageEvent = {
      data: { type: 'status_updated', status: currentStatus },
    };

    const stream$ = this.participantsService.getLobbyEventsObservable().pipe(
      filter(
        (event: LobbyEvent) =>
          event.meetingId === id &&
          event.userId === req.user.id &&
          event.type === 'status_updated',
      ),
      map(
        (event: LobbyEvent) =>
          ({
            data: { type: 'status_updated', status: event.status },
          }) as MessageEvent,
      ),
    );

    return concat(of(initialEvent), stream$);
  }
}
