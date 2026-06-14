import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Subject } from 'rxjs';

export interface LobbyEvent {
  meetingId: string;
  type: 'lobby_updated' | 'status_updated';
  userId?: string;
  status?: string;
}
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ParticipantRepository } from '../repositories/participant.repository';
import { MeetingRepository } from '../repositories/meeting.repository';
import {
  LiveKitService,
  LiveKitTokenGrants,
} from '../../../providers/livekit/livekit.service';
import { UsersService } from '../../users/users.service';
import { MailService } from '../../../providers/mail/mail.service';
import {
  Participant,
  MeetingStatus,
  ParticipantStatus,
  MeetingPermission,
} from '../entities';
import { JoinResponseDto } from '../dto/join-response.dto';
import { EntityManager } from 'typeorm';
import {
  BreakoutRoom,
  BreakoutRoomStatus,
} from '../../breakout-rooms/entities/breakout-room.entity';
import { MeetLog, LogType } from '../../meetlogs/entities/meet-log.entity';

@Injectable()
export class ParticipantsService {
  private readonly logger = new Logger(ParticipantsService.name);
  private readonly lobbyEvents$ = new Subject<LobbyEvent>();

  getLobbyEventsObservable() {
    return this.lobbyEvents$.asObservable();
  }

  emitLobbyEvent(event: LobbyEvent) {
    this.lobbyEvents$.next(event);
  }

  async getParticipantStatus(
    meetingId: string,
    userId: string,
  ): Promise<string> {
    const participant = await this.participantsRepository.findByMeetingAndUser(
      meetingId,
      userId,
    );
    return participant?.status || 'none';
  }

  constructor(
    private readonly participantsRepository: ParticipantRepository,
    private readonly meetingsRepository: MeetingRepository,
    private readonly liveKitService: LiveKitService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly entityManager: EntityManager,
  ) {}

  async joinMeeting(
    id: string,
    userId: string,
    password?: string,
    displayName?: string,
  ): Promise<JoinResponseDto> {
    this.logger.log(`Attempting to join meeting: ${id} for user: ${userId}`);
    try {
      const meeting = await this.meetingsRepository.findById(id);
      if (!meeting) throw new NotFoundException('Meeting not found');

      if (meeting.status === MeetingStatus.CANCELLED) {
        throw new BadRequestException('Cannot join a cancelled meeting');
      }

      if (meeting.status === MeetingStatus.COMPLETED) {
        throw new BadRequestException(
          'Meeting has already completed and cannot be rejoined',
        );
      }

      let participant = await this.participantsRepository.findByMeetingAndUser(
        id,
        userId,
      );

      const isOrganizer =
        participant?.isOrganizer || meeting.organizerId === userId;

      // Password Validation
      if (meeting.password && !isOrganizer) {
        if (!password) {
          throw new UnauthorizedException('Password required for this meeting');
        }

        if (password !== meeting.password) {
          throw new UnauthorizedException('Invalid meeting password');
        }
      }

      const organizerPermissions = [
        MeetingPermission.EDIT_SUMMARY,
        MeetingPermission.CHAT_WITH_AI,
        MeetingPermission.UPDATE_PERMISSIONS,
        MeetingPermission.VIEW_TRANSCRIPT,
        MeetingPermission.DOWNLOAD_RECORDING,
        MeetingPermission.EDIT_MEETING_INFO,
        MeetingPermission.MANAGE_POLLS,
      ];

      if (!participant) {
        // If waiting room is enabled and user is not organizer, they start as WAITING
        const initialStatus =
          meeting.waitingRoomEnabled && !isOrganizer
            ? ParticipantStatus.WAITING
            : ParticipantStatus.ADMITTED;

        const newParticipant = this.participantsRepository.create({
          meetingId: id,
          userId,
          displayName: displayName, // Save the name from lobby
          isOrganizer: isOrganizer,
          status: initialStatus,
          isInMeeting: initialStatus === ParticipantStatus.ADMITTED,
          permissions: isOrganizer ? organizerPermissions : [],
        });
        participant = (await this.participantsRepository.save(
          newParticipant,
        )) as Participant;
      } else {
        // If participant already exists, update their displayName if provided
        if (displayName) {
          participant.displayName = displayName;
        }

        // If participant already exists
        if (isOrganizer && !participant.isOrganizer) {
          // Upgrade existing record to organizer if they are the meeting owner
          participant.isOrganizer = true;
          participant.status = ParticipantStatus.ADMITTED;
          participant.permissions = organizerPermissions;
        }

        // Refined Waiting Room Logic:
        if (
          meeting.waitingRoomEnabled &&
          !isOrganizer &&
          participant.status !== ParticipantStatus.ADMITTED
        ) {
          participant.status = ParticipantStatus.WAITING;
        }

        // If they are ADMITTED (or just became admitted), mark as in meeting
        if (participant.status === ParticipantStatus.ADMITTED) {
          participant.isInMeeting = true;
        }

        participant = (await this.participantsRepository.save(
          participant,
        )) as Participant;
      }

      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      const fullName = displayName || `${user.firstName} ${user.lastName}`;

      // If user is WAITING or DENIED, do not generate token
      if (!participant || participant.status !== ParticipantStatus.ADMITTED) {
        if (participant?.status === ParticipantStatus.WAITING) {
          this.emitLobbyEvent({
            meetingId: id,
            type: 'lobby_updated',
          });
        }
        return {
          meetingId: meeting.id,
          organizerId: meeting.organizerId,
          status: participant?.status || ParticipantStatus.DENIED,
          token: '',
          liveKitUrl: '',
          participants: [],
        };
      }

      // Safety check for livekit room name
      const roomName = meeting.livekitRoomName || meeting.id || '';

      const grants: LiveKitTokenGrants = {
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        roomRecord: isOrganizer,
      };

      const metadata = JSON.stringify({ avatar: user.picture });

      const token = await this.liveKitService.generateToken(
        roomName,
        userId,
        fullName,
        grants,
        metadata,
      );

      if (meeting.status === MeetingStatus.SCHEDULED) {
        const scheduledTime = meeting.startTime
          ? new Date(meeting.startTime).getTime()
          : 0;
        const now = Date.now();

        // Host prep mode: If organizer joins early, don't change meeting status to ONGOING
        const isEarlyJoin = scheduledTime - now > 10 * 60 * 1000;
        if (isOrganizer && isEarlyJoin) {
          this.logger.log(
            `Organizer joined meeting ${id} early. Keeping SCHEDULED status for prep.`,
          );
        } else {
          meeting.status = MeetingStatus.ONGOING;
          meeting.actualStartTime = new Date();
          await this.meetingsRepository.save(meeting);
        }
      }

      // User actually joined the meeting call, log event
      await this.logMeetLog(id, LogType.USER_JOINED, userId, {
        displayName: fullName,
        email: user.email,
        avatar: user.picture || undefined,
      });

      return {
        meetingId: meeting.id,
        organizerId: meeting.organizerId,
        status: participant.status,
        token,
        liveKitUrl: this.configService.get('LIVEKIT_URL', ''),
        participants: [],
      };
    } catch (err) {
      this.logger.error(`Error in joinMeeting for meeting ${id}:`, err);
      throw err;
    }
  }

  async admitParticipant(
    id: string,
    userId: string,
    hostId: string,
  ): Promise<void> {
    this.logger.log(
      `Admitting user ${userId} to meeting ${id} by host ${hostId}`,
    );
    const meeting = await this.meetingsRepository.findById(id);
    if (!meeting) throw new NotFoundException('Meeting not found');

    if (meeting.organizerId !== hostId) {
      throw new ForbiddenException('Only the organizer can admit participants');
    }

    const participant = await this.participantsRepository.findByMeetingAndUser(
      id,
      userId,
    );
    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    participant.status = ParticipantStatus.ADMITTED;
    participant.isInMeeting = true;
    await this.participantsRepository.save(participant);

    this.emitLobbyEvent({
      meetingId: id,
      type: 'status_updated',
      userId,
      status: ParticipantStatus.ADMITTED,
    });
    this.emitLobbyEvent({
      meetingId: id,
      type: 'lobby_updated',
    });

    const targetUser = await this.usersService.findById(userId);
    await this.logMeetLog(id, LogType.PARTICIPANT_ADMITTED, hostId, {
      targetUserId: userId,
      targetEmail: targetUser?.email || 'Unknown',
      targetName: targetUser
        ? `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim()
        : 'Unknown',
    });
  }

  async rejectParticipant(
    id: string,
    userId: string,
    hostId: string,
  ): Promise<void> {
    const meeting = await this.meetingsRepository.findById(id);
    if (!meeting) throw new NotFoundException('Meeting not found');

    if (meeting.organizerId !== hostId) {
      throw new ForbiddenException(
        'Only the organizer can reject participants',
      );
    }

    const participant = await this.participantsRepository.findByMeetingAndUser(
      id,
      userId,
    );
    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    participant.status = ParticipantStatus.DENIED;
    await this.participantsRepository.save(participant);

    this.emitLobbyEvent({
      meetingId: id,
      type: 'status_updated',
      userId,
      status: ParticipantStatus.DENIED,
    });
    this.emitLobbyEvent({
      meetingId: id,
      type: 'lobby_updated',
    });
  }

  async leaveMeeting(id: string, userId: string): Promise<void> {
    const participant = await this.participantsRepository.findByMeetingAndUser(
      id,
      userId,
    );
    if (!participant) return;

    if (participant.status === ParticipantStatus.WAITING) {
      // If user cancels or leaves the lobby before ever being admitted, delete the record
      // to keep the database and host's lobby display clean.
      await this.participantsRepository.remove(participant);
      this.emitLobbyEvent({
        meetingId: id,
        type: 'lobby_updated',
      });
      return;
    }

    if (participant.isInMeeting) {
      participant.isInMeeting = false;
      await this.participantsRepository.save(participant);

      const user = await this.usersService.findById(userId);
      await this.logMeetLog(id, LogType.USER_LEFT, userId, {
        displayName:
          participant.displayName ||
          (user ? `${user.firstName} ${user.lastName}` : 'Unknown'),
        email: user?.email || 'Unknown',
        avatar: user?.picture || undefined,
      });

      // Check if there are any active participants left in the meeting
      const activeParticipants = await this.participantsRepository
        .createQueryBuilder('p')
        .where('p.meetingId = :meetingId', { meetingId: id })
        .andWhere('p.isInMeeting = true')
        .getCount();

      if (activeParticipants === 0) {
        // Check if there are active breakout rooms
        const activeBreakout = await this.entityManager.findOne(BreakoutRoom, {
          where: { meetingId: id, status: BreakoutRoomStatus.ACTIVE },
        });

        if (activeBreakout) {
          this.logger.log(
            `No active participants left in main room of meeting ${id}, but active breakout rooms exist. Keeping the meeting active.`,
          );
          return;
        }

        this.logger.log(
          `No active participants left in meeting ${id}. Scheduling auto-closure check in 15 minutes.`,
        );

        setTimeout(
          () => {
            void (async () => {
              try {
                const currentActiveParticipants =
                  await this.participantsRepository
                    .createQueryBuilder('p')
                    .where('p.meetingId = :meetingId', { meetingId: id })
                    .andWhere('p.isInMeeting = true')
                    .getCount();

                if (currentActiveParticipants === 0) {
                  const currentActiveBreakout =
                    await this.entityManager.findOne(BreakoutRoom, {
                      where: {
                        meetingId: id,
                        status: BreakoutRoomStatus.ACTIVE,
                      },
                    });

                  if (currentActiveBreakout) {
                    this.logger.log(
                      `Breakout rooms are still active for meeting ${id} after 15 minutes idle check. Skipping auto-closure.`,
                    );
                    return;
                  }

                  const meeting = await this.meetingsRepository.findById(id);
                  if (meeting && meeting.status === MeetingStatus.ONGOING) {
                    // Safety guard: only auto-close if the meeting has been
                    // ongoing for at least 5 minutes. This prevents pre-meeting
                    // test joins (join/leave before the actual meeting) from
                    // permanently locking the room via the idle-close timer.
                    const MIN_MEETING_DURATION_MS = 5 * 60 * 1000; // 5 minutes
                    const startedAt = meeting.actualStartTime
                      ? new Date(meeting.actualStartTime).getTime()
                      : 0;
                    const ongoingDuration = Date.now() - startedAt;

                    if (ongoingDuration < MIN_MEETING_DURATION_MS) {
                      this.logger.log(
                        `Meeting ${id} has been ongoing for only ${Math.round(ongoingDuration / 1000)}s. ` +
                          `Skipping auto-closure (minimum ${MIN_MEETING_DURATION_MS / 60000} min required).`,
                      );
                      // Reset to SCHEDULED so late-comers can still join
                      meeting.status = MeetingStatus.SCHEDULED;
                      meeting.actualStartTime = undefined;
                      await this.meetingsRepository.save(meeting);
                      return;
                    }

                    this.logger.log(
                      `Meeting ${id} remains empty for 15 minutes. Auto-closing meeting.`,
                    );
                    meeting.status = MeetingStatus.COMPLETED;
                    meeting.actualEndTime = new Date();
                    await this.meetingsRepository.save(meeting);

                    try {
                      await this.liveKitService.deleteRoom(
                        meeting.livekitRoomName || meeting.id || '',
                      );
                    } catch (err) {
                      this.logger.warn(
                        `Could not delete LiveKit room ${meeting.livekitRoomName} in auto-closure check`,
                        err,
                      );
                    }
                  }
                } else {
                  this.logger.log(
                    `Meeting ${id} has ${currentActiveParticipants} active participants now. Skipping auto-closure check.`,
                  );
                }
              } catch (err) {
                this.logger.error(
                  `Error in auto-closing idle check for meeting ${id}:`,
                  err,
                );
              }
            })();
          },
          15 * 60 * 1000,
        ); // 15 minutes idle check
      }
    }
  }

  async getParticipants(id: string, page: number = 1, limit: number = 10) {
    const realParticipants =
      await this.participantsRepository.findByMeetingId(id);

    const total = realParticipants.length;
    const startIndex = (page - 1) * limit;
    const items = realParticipants.slice(startIndex, startIndex + limit);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateParticipantPermissions(
    meetingId: string,
    targetUserId: string,
    permissions: MeetingPermission[],
    requesterId: string,
  ): Promise<Participant> {
    const meeting = await this.meetingsRepository.findById(meetingId);
    if (!meeting) throw new NotFoundException('Meeting not found');

    // Chỉ chủ phòng mới có quyền thay đổi phân quyền
    if (meeting.organizerId !== requesterId) {
      throw new ForbiddenException(
        'Only the organizer can update participant permissions',
      );
    }

    const participant = await this.participantsRepository.findByMeetingAndUser(
      meetingId,
      targetUserId,
    );

    if (!participant) {
      throw new NotFoundException('Participant not found in this meeting');
    }

    // Cập nhật quyền
    participant.permissions = permissions;
    const saved = (await this.participantsRepository.save(
      participant,
    )) as Participant;

    const targetUser = await this.usersService.findById(targetUserId);
    const targetName = targetUser
      ? `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim()
      : 'Unknown';

    await this.logMeetLog(meetingId, LogType.PERMISSIONS_CHANGED, requesterId, {
      targetUserId,
      targetEmail: targetUser?.email || 'Unknown',
      targetName,
      permissions,
    });

    return saved;
  }

  async updateBulkParticipantsPermissions(
    meetingId: string,
    userIds: string[] | undefined,
    action: 'grant' | 'revoke',
    permissions: MeetingPermission[],
    requesterId: string,
  ): Promise<{ count: number }> {
    this.logger.log(
      `Bulk update: meetingId=${meetingId}, action=${action}, permissions=${JSON.stringify(permissions)}`,
    );
    const meeting = await this.meetingsRepository.findById(meetingId);
    if (!meeting) throw new NotFoundException('Meeting not found');

    if (meeting.organizerId !== requesterId) {
      throw new ForbiddenException(
        'Only the organizer can update participant permissions',
      );
    }

    const query = this.participantsRepository
      .createQueryBuilder('participant')
      .where('participant.meetingId = :meetingId', { meetingId })
      .andWhere('participant.isOrganizer = false');

    if (userIds && userIds.length > 0) {
      query.andWhere('participant.userId IN (:...userIds)', { userIds });
    }

    const participants = await query.getMany();
    this.logger.log(`Updating ${participants.length} participants`);

    for (const participant of participants) {
      const currentPermissions = participant.permissions || [];
      let newPermissions: MeetingPermission[];

      if (action === 'grant') {
        newPermissions = Array.from(
          new Set([...currentPermissions, ...permissions]),
        );
      } else {
        newPermissions = currentPermissions.filter(
          (p) => !permissions.includes(p),
        );
      }

      participant.permissions = newPermissions;
    }

    if (participants.length > 0) {
      await this.participantsRepository.save(participants);
      this.logger.log(
        `Successfully updated permissions for ${participants.length} participants`,
      );

      await this.logMeetLog(
        meetingId,
        LogType.PERMISSIONS_CHANGED,
        requesterId,
        {
          action,
          permissions,
          count: participants.length,
          userIds: userIds || [],
        },
      );
    }

    return { count: participants.length };
  }

  private async logMeetLog(
    meetingId: string,
    type: LogType,
    triggeredByUserId: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      const newEvent = this.entityManager.create(MeetLog, {
        meetingId,
        type,
        triggeredByUserId,
        metadata: metadata || undefined,
      });
      await this.entityManager.save(MeetLog, newEvent);
    } catch (err) {
      this.logger.error(`Failed to log meeting event ${type}:`, err);
    }
  }
}
