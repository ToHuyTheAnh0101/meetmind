import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Meeting, MeetingStatus, MeetingPermission } from '../entities';
import {
  LiveKitService,
  LiveKitTokenGrants,
} from '../../../providers/livekit/livekit.service';
import { UsersService } from '../../users/users.service';
import { CreateMeetingDto } from '../dto/create-meeting.dto';
import { UpdateMeetingDto } from '../dto/update-meeting.dto';
import { ListMeetingsDto } from '../dto/list-meetings.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { PaginationHelper } from '../../../common/utils/pagination.helper';
import {
  JoinResponseDto,
  ParticipantSummaryDto,
} from '../dto/join-response.dto';
import { MeetingRepository } from '../repositories/meeting.repository';
import { ParticipantRepository } from '../repositories/participant.repository';

@Injectable()
export class MeetingsService {
  constructor(
    private meetingsRepository: MeetingRepository,
    private participantsRepository: ParticipantRepository,
    private liveKitService: LiveKitService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  async create(dto: CreateMeetingDto, userId: string): Promise<Meeting> {
    const meeting = this.meetingsRepository.create({
      ...dto,
      startTime: new Date(dto.startTime),
      organizerId: userId,
    });

    const savedMeeting = await this.meetingsRepository.save(meeting);

    try {
      await this.liveKitService.createRoom(savedMeeting.id);
      savedMeeting.livekitRoomName = savedMeeting.id;
      await this.meetingsRepository.save(savedMeeting);
    } catch (error) {
      await this.meetingsRepository.remove(savedMeeting);
      throw error;
    }

    const organizerPermissions = [
      MeetingPermission.EDIT_SUMMARY,
      MeetingPermission.CHAT_WITH_AI,
      MeetingPermission.UPDATE_PERMISSIONS,
      MeetingPermission.VIEW_TRANSCRIPT,
      MeetingPermission.DOWNLOAD_RECORDING,
      MeetingPermission.EDIT_MEETING_INFO,
    ];

    await this.participantsRepository.save({
      meetingId: savedMeeting.id,
      userId,
      isOrganizer: true,
      permissions: organizerPermissions,
    });

    return savedMeeting;
  }

  async joinMeeting(id: string, userId: string): Promise<JoinResponseDto> {
    console.log(`[MeetingsService] Attempting to join meeting: ${id} for user: ${userId} (v2-defensive)`);
    try {
      const meeting = await this.findOne(id);

      if (
        meeting.status === MeetingStatus.COMPLETED ||
        meeting.status === MeetingStatus.CANCELLED
      ) {
        throw new BadRequestException(
          'Cannot join a completed or cancelled meeting',
        );
      }

      let participant = await this.participantsRepository.findByMeetingAndUser(
        id,
        userId,
      );

      if (!participant) {
        participant = await this.participantsRepository.save({
          meetingId: id,
          userId,
          isOrganizer: false,
          permissions: [],
        });
      }

      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      const fullName = `${user.firstName} ${user.lastName}`;

      const isOrganizer = participant.isOrganizer;
      
      // Safety check for livekit room name
      const roomName = meeting.livekitRoomName || meeting.id;
      
      const grants: LiveKitTokenGrants = {
        roomJoin: true,
        room: roomName,
        canPublish: true, // Allow all for now or check preferences
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

      const participants = await this.getParticipants(id);
      const participantSummaries: ParticipantSummaryDto[] = participants
        .filter(p => p && p.user) // Double defensive check
        .map(
          (p) => ({
            id: p.user?.id || p.userId, // Fallback to userId if user object is partially broken
            firstName: p.user?.firstName || 'Unknown',
            lastName: p.user?.lastName || 'Participant',
            isOrganizer: p.isOrganizer,
            permissions: p.permissions,
          }),
        );

      return {
        meetingId: meeting.id,
        token,
        liveKitUrl: this.configService.get<string>('LIVEKIT_URL') || '',
        participants: participantSummaries,
      };
    } catch (error) {
      console.error('CRITICAL ERROR in joinMeeting:', error);
      throw error;
    }
  }

  async endMeeting(id: string, userId: string): Promise<Meeting> {
    const meeting = await this.findOne(id);

    if (meeting.organizerId !== userId) {
      throw new ForbiddenException('Only organizer can end the meeting');
    }

    if (meeting.status === MeetingStatus.COMPLETED) {
      throw new BadRequestException('Meeting already completed');
    }

    const now = new Date();

    meeting.status = MeetingStatus.COMPLETED;
    meeting.endTime = now;

    await this.liveKitService.deleteRoom(meeting.livekitRoomName);

    return this.meetingsRepository.save(meeting);
  }

  async findAll(
    userId: string,
    queryDto?: ListMeetingsDto,
  ): Promise<PaginatedResult<Meeting>> {
    const { skip, take } = PaginationHelper.getSkipTake(queryDto || new ListMeetingsDto());

    const [items, total] = await this.meetingsRepository.findAllForUser(
      userId,
      skip,
      take,
    );

    return PaginationHelper.createPaginatedResult(items, total, queryDto || new ListMeetingsDto());
  }

  async findOne(id: string): Promise<Meeting> {
    const meeting = await this.meetingsRepository.findById(id);

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    return meeting;
  }

  async update(
    id: string,
    dto: UpdateMeetingDto,
    userId: string,
  ): Promise<Meeting> {
    const meeting = await this.findOne(id);

    if (meeting.organizerId !== userId) {
      throw new ForbiddenException('Only organizer can update the meeting');
    }

    Object.assign(meeting, {
      ...dto,
      startTime: dto.startTime ? new Date(dto.startTime) : meeting.startTime,
    });

    return this.meetingsRepository.save(meeting);
  }

  async remove(id: string, userId: string): Promise<void> {
    const meeting = await this.findOne(id);

    if (meeting.organizerId !== userId) {
      throw new ForbiddenException('Only organizer can delete the meeting');
    }

    await this.liveKitService.deleteRoom(meeting.livekitRoomName);
    await this.meetingsRepository.remove(meeting);
  }

  async getParticipants(id: string) {
    return this.participantsRepository.findByMeetingId(id);
  }
}
