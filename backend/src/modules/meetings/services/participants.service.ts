import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ParticipantRepository } from '../repositories/participant.repository';
import { MeetingRepository } from '../repositories/meeting.repository';
import { MeetingSessionRepository } from '../repositories/meeting-session.repository';
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
  MeetingSessionStatus,
} from '../entities';
import {
  JoinResponseDto,
  ParticipantSummaryDto,
} from '../dto/join-response.dto';

@Injectable()
export class ParticipantsService {
  private readonly logger = new Logger(ParticipantsService.name);

  constructor(
    private readonly participantsRepository: ParticipantRepository,
    private readonly meetingsRepository: MeetingRepository,
    private readonly sessionRepository: MeetingSessionRepository,
    private readonly liveKitService: LiveKitService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async joinMeeting(
    id: string,
    userId: string,
    password?: string,
    displayName?: string,
  ): Promise<JoinResponseDto> {
    console.log(
      `[ParticipantsService] Attempting to join meeting: ${id} for user: ${userId}`,
    );
    try {
      const meeting = await this.meetingsRepository.findById(id);
      if (!meeting) throw new NotFoundException('Meeting not found');

      if (meeting.status === MeetingStatus.CANCELLED) {
        throw new BadRequestException('Cannot join a cancelled meeting');
      }

      if (meeting.status === MeetingStatus.COMPLETED) {
        meeting.status = MeetingStatus.ONGOING;
        await this.meetingsRepository.save(meeting);
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
          (!participant.isInMeeting ||
            participant.status === ParticipantStatus.DENIED)
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
      const roomName = meeting.livekitRoomName || meeting.id;

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
        meeting.status = MeetingStatus.ONGOING;
        await this.meetingsRepository.save(meeting);
      }

      const participantsData = await this.getParticipants(id, 1, 100);
      const participantSummaries: ParticipantSummaryDto[] =
        participantsData.items
          .filter((p) => p && p.user)
          .map((p) => ({
            id: p.user?.id || p.userId,
            firstName: p.user?.firstName || 'Unknown',
            lastName: p.user?.lastName || 'Participant',
            picture: p.user?.picture,
            isOrganizer: p.isOrganizer,
            permissions: p.permissions,
            status: p.status,
          }));

      return {
        meetingId: meeting.id,
        organizerId: meeting.organizerId,
        status: ParticipantStatus.ADMITTED,
        token,
        liveKitUrl: this.configService.get<string>('LIVEKIT_URL') || '',
        participants: participantSummaries,
      };
    } catch (error) {
      console.error('CRITICAL ERROR in joinMeeting:', error);
      throw error;
    }
  }

  async admitParticipant(
    id: string,
    userId: string,
    hostId: string,
  ): Promise<void> {
    console.log(
      `[ParticipantsService] Admitting user ${userId} to meeting ${id} by host ${hostId}`,
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
  }

  async leaveMeeting(id: string, userId: string): Promise<void> {
    const participant = await this.participantsRepository.findByMeetingAndUser(
      id,
      userId,
    );
    if (participant) {
      participant.isInMeeting = false;
      await this.participantsRepository.save(participant);

      // Check if there are any active participants left in the meeting
      const activeParticipants = await this.participantsRepository
        .createQueryBuilder('p')
        .where('p.meetingId = :meetingId', { meetingId: id })
        .andWhere('p.isInMeeting = true')
        .getCount();

      if (activeParticipants === 0) {
        this.logger.log(
          `No active participants left in meeting ${id}. Auto-closing the active session.`,
        );
        const activeSession =
          await this.sessionRepository.findActiveByMeeting(id);
        if (activeSession) {
          activeSession.actualEndTime = new Date();
          activeSession.status = MeetingSessionStatus.COMPLETED;
          await this.sessionRepository.save(activeSession);

          // Clear session cache
          const cacheKey = `session:${id}`;
          await this.cacheManager.del(cacheKey);
          this.logger.log(
            `Active session ${activeSession.id} for meeting ${id} has been auto-completed.`,
          );
        }
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
    }

    return { count: participants.length };
  }
}
