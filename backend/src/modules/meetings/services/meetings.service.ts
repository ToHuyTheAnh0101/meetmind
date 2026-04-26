import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { Meeting, MeetingStatus, Participant, ParticipantStatus, MeetingPermission, MeetingAccessType } from '../entities';
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
    const { password, ...meetingData } = dto;
    let hashedPassword = password;

    if (password) {
      const salt = await bcrypt.genSalt();
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const organizerPermissions = [
      MeetingPermission.EDIT_SUMMARY,
      MeetingPermission.CHAT_WITH_AI,
      MeetingPermission.UPDATE_PERMISSIONS,
      MeetingPermission.VIEW_TRANSCRIPT,
      MeetingPermission.DOWNLOAD_RECORDING,
      MeetingPermission.EDIT_MEETING_INFO,
    ];

    const meeting = this.meetingsRepository.create({
      ...meetingData,
      password: hashedPassword,
      startTime: new Date(dto.startTime),
      organizerId: userId,
      // Default configurations if not provided
      accessType: dto.accessType || MeetingAccessType.PUBLIC,
      waitingRoomEnabled: dto.waitingRoomEnabled ?? false,
      muteOnJoin: dto.muteOnJoin ?? false,
      inviteeEmails: dto.inviteeEmails || [],
      reminderMinutes: dto.reminderMinutes ?? 10,
      participants: [
        this.participantsRepository.create({
          userId,
          isOrganizer: true,
          permissions: organizerPermissions,
          status: ParticipantStatus.ADMITTED,
        })
      ]
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

    return this.findOne(savedMeeting.id);
  }

  async joinMeeting(id: string, userId: string, password?: string, displayName?: string): Promise<JoinResponseDto> {
    console.log(`[MeetingsService] Attempting to join meeting: ${id} for user: ${userId}`);
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

      const isOrganizer = participant?.isOrganizer || meeting.organizerId === userId;

      // Password Validation
      if (meeting.password && !isOrganizer) {
        if (!password) {
          throw new UnauthorizedException('Password required for this meeting');
        }
        
        const isMatch = await bcrypt.compare(password, meeting.password);
        if (!isMatch) {
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
      ];

      if (!participant) {
        // If waiting room is enabled and user is not organizer, they start as WAITING
        const initialStatus = (meeting.waitingRoomEnabled && !isOrganizer) 
          ? ParticipantStatus.WAITING 
          : ParticipantStatus.ADMITTED;

        participant = await this.participantsRepository.save({
          meetingId: id,
          userId,
          isOrganizer: isOrganizer,
          status: initialStatus,
          permissions: isOrganizer ? organizerPermissions : [],
        });
      } else if (isOrganizer && !participant.isOrganizer) {
        // Upgrade existing record to organizer if they are the meeting owner
        participant.isOrganizer = true;
        participant.status = ParticipantStatus.ADMITTED;
        participant.permissions = organizerPermissions;
        await this.participantsRepository.save(participant);
      }

      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      const fullName = displayName || `${user.firstName} ${user.lastName}`;

      // If user is WAITING or DENIED, do not generate token
      if (participant.status !== ParticipantStatus.ADMITTED) {
         return {
            meetingId: meeting.id,
            organizerId: meeting.organizerId,
            status: participant.status,
            token: '',
            liveKitUrl: '',
            participants: [], // Optional: hide other participants from waiting users
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
      const participantSummaries: ParticipantSummaryDto[] = participantsData.items
        .filter(p => p && p.user)
        .map(
          (p) => ({
            id: p.user?.id || p.userId,
            firstName: p.user?.firstName || 'Unknown',
            lastName: p.user?.lastName || 'Participant',
            isOrganizer: p.isOrganizer,
            permissions: p.permissions,
            status: p.status,
          }),
        );

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

  async admitParticipant(id: string, userId: string, hostId: string): Promise<void> {
    const meeting = await this.findOne(id);
    if (meeting.organizerId !== hostId) {
      throw new ForbiddenException('Only the organizer can admit participants');
    }

    const participant = await this.participantsRepository.findByMeetingAndUser(id, userId);
    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    participant.status = ParticipantStatus.ADMITTED;
    await this.participantsRepository.save(participant);
  }

  async rejectParticipant(id: string, userId: string, hostId: string): Promise<void> {
    const meeting = await this.findOne(id);
    if (meeting.organizerId !== hostId) {
      throw new ForbiddenException('Only the organizer can reject participants');
    }

    const participant = await this.participantsRepository.findByMeetingAndUser(id, userId);
    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    participant.status = ParticipantStatus.DENIED;
    await this.participantsRepository.save(participant);
  }

  async endMeeting(id: string, userId: string): Promise<Meeting> {
    const meeting = await this.findOne(id);

    if (meeting.organizerId !== userId) {
      throw new ForbiddenException('Only the organizer can end the meeting for everyone');
    }

    if (meeting.status === MeetingStatus.COMPLETED) {
      throw new BadRequestException('Meeting is already completed');
    }

    const now = new Date();

    meeting.status = MeetingStatus.COMPLETED;
    meeting.endTime = now;

    // Delete the room so all users are booted
    try {
      await this.liveKitService.deleteRoom(meeting.livekitRoomName || meeting.id);
    } catch (e) {
      console.warn(`Could not delete LiveKit room ${meeting.livekitRoomName}, might already be gone.`);
    }

    return this.meetingsRepository.save(meeting);
  }

  /**
   * Called automatically when the last participant leaves and a grace period expires
   */
  async autoComplete(id: string): Promise<Meeting> {
    const meeting = await this.findOne(id);
    if (meeting.status === MeetingStatus.COMPLETED) return meeting;

    meeting.status = MeetingStatus.COMPLETED;
    meeting.endTime = new Date();
    
    try {
      await this.liveKitService.deleteRoom(meeting.livekitRoomName || meeting.id);
    } catch (e) {}

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

    const { password, ...updateData } = dto;
    
    if (password) {
      const salt = await bcrypt.genSalt();
      updateData['password'] = await bcrypt.hash(password, salt);
    }

    Object.assign(meeting, {
      ...updateData,
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

  async getParticipants(id: string, page: number = 1, limit: number = 10) {
    const realParticipants = await this.participantsRepository.findByMeetingId(id);
    
    // Add 19 mock participants for demonstration (as requested: "mock 20 people")
    const mockNames = [
      { f: 'Nguyễn', l: 'An' }, { f: 'Trần', l: 'Bình' }, { f: 'Lê', l: 'Chi' },
      { f: 'Phạm', l: 'Dũng' }, { f: 'Hoàng', l: 'Em' }, { f: 'Vũ', l: 'Giang' },
      { f: 'Đặng', l: 'Hải' }, { f: 'Bùi', l: 'Hoa' }, { f: 'Đỗ', l: 'Khánh' },
      { f: 'Hồ', l: 'Lan' }, { f: 'Ngô', l: 'Minh' }, { f: 'Dương', l: 'Nam' },
      { f: 'Lý', l: 'Oanh' }, { f: 'Phan', l: 'Phúc' }, { f: 'Trương', l: 'Quân' },
      { f: 'Lê', l: 'Thắng' }, { f: 'Phạm', l: 'Tú' }, { f: 'Nguyễn', l: 'Vân' }, { f: 'Đỗ', l: 'Yến' }
    ];

    const mocks = mockNames.map((n, i) => ({
      id: `mock-${i}`,
      meetingId: id,
      userId: `user-mock-${i}`,
      isOrganizer: false,
      permissions: [],
      status: ParticipantStatus.ADMITTED,
      user: {
        id: `user-mock-${i}`,
        firstName: n.f,
        lastName: n.l,
        picture: `https://i.pravatar.cc/150?u=mock${i}`,
        email: `mock${i}@example.com`
      }
    }));

    const allParticipants = [...realParticipants, ...mocks];
    
    // Manual pagination for the demo
    const total = allParticipants.length;
    const startIndex = (page - 1) * limit;
    const items = allParticipants.slice(startIndex, startIndex + limit);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    };
  }
}
