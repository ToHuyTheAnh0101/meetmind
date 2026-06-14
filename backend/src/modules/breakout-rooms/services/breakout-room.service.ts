import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { MeetingRepository } from '../../meetings/repositories/meeting.repository';
import { BreakoutRoomRepository } from '../repositories/breakout-room.repository';
import { BreakoutRoomParticipantRepository } from '../repositories/breakout-room-participant.repository';
import { SetupBreakoutRoomsDto } from '../dto/breakout-room.dto';
import {
  BreakoutRoom,
  BreakoutRoomStatus,
} from '../entities/breakout-room.entity';
import { BreakoutRoomParticipant } from '../entities/breakout-room-participant.entity';
import { LiveKitService } from '../../../providers/livekit/livekit.service';
import { EntityManager } from 'typeorm';
import { MeetLog, LogType } from '../../meetlogs/entities/meet-log.entity';

@Injectable()
export class BreakoutRoomService {
  private readonly logger = new Logger(BreakoutRoomService.name);

  constructor(
    private readonly meetingRepository: MeetingRepository,
    private readonly breakoutRoomRepository: BreakoutRoomRepository,
    private readonly participantRepository: BreakoutRoomParticipantRepository,
    private readonly liveKitService: LiveKitService,
    private readonly entityManager: EntityManager,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async setupBreakoutRooms(
    meetingId: string,
    userId: string,
    dto: SetupBreakoutRoomsDto,
  ) {
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    if (meeting.organizerId !== userId) {
      throw new ForbiddenException('Only organizer can setup breakout rooms');
    }

    // 1. Xóa các phòng cũ (nếu có) để setup lại từ đầu
    await this.breakoutRoomRepository.removeAllForMeeting(meetingId);

    // 2. Tạo các phòng mới và gán người tham gia
    for (const roomDto of dto.rooms || []) {
      const livekitRoomName = `breakout-${meetingId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const room = this.breakoutRoomRepository.create({
        meetingId,
        name: roomDto.name,
        livekitRoomName,
        status: BreakoutRoomStatus.CREATED,
        createdByUserId: userId,
        participants: roomDto.assignments?.map((as) =>
          this.participantRepository.create({ userId: as.userId }),
        ),
      });

      const savedRoom = await this.breakoutRoomRepository.save(room);
      this.logger.log(
        `Created room ${savedRoom.name} with ${savedRoom.participants?.length || 0} participants`,
      );
    }

    // 3. Lấy lại toàn bộ danh sách phòng kèm participants để trả về
    const finalRooms =
      await this.breakoutRoomRepository.findByMeetingId(meetingId);
    this.logger.log(`Returning ${finalRooms.length} rooms after setup.`);
    return finalRooms;
  }

  async getBreakoutRooms(meetingId: string) {
    return this.breakoutRoomRepository.findByMeetingId(meetingId);
  }

  async startBreakout(meetingId: string, userId: string) {
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) throw new NotFoundException('Meeting not found');
    if (meeting.organizerId !== userId)
      throw new ForbiddenException('Only organizer can start breakout');

    const rooms = await this.breakoutRoomRepository.findByMeetingId(meetingId);

    for (const room of rooms) {
      room.status = BreakoutRoomStatus.ACTIVE;
      await this.breakoutRoomRepository.save(room);

      // Tạo phòng trên LiveKit server
      if (room.livekitRoomName) {
        await this.liveKitService.createRoom(room.livekitRoomName);
      }
    }

    // Log BREAKOUT_STARTED event
    try {
      const newEvent = this.entityManager.create(MeetLog, {
        meetingId,
        type: LogType.BREAKOUT_STARTED,
        triggeredByUserId: userId,
        metadata: {
          roomsCount: rooms.length,
          roomNames: rooms.map((r) => r.name),
        },
      });
      await this.entityManager.save(MeetLog, newEvent);
    } catch (err) {
      this.logger.error('Failed to log BREAKOUT_STARTED event:', err);
    }

    return rooms;
  }

  async endBreakout(meetingId: string, userId: string) {
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) throw new NotFoundException('Meeting not found');
    if (meeting.organizerId !== userId)
      throw new ForbiddenException('Only organizer can end breakout');

    // Log BREAKOUT_ENDED event before deleting rooms
    try {
      const newEvent = this.entityManager.create(MeetLog, {
        meetingId,
        type: LogType.BREAKOUT_ENDED,
        triggeredByUserId: userId,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });
      await this.entityManager.save(MeetLog, newEvent);
    } catch (err) {
      this.logger.error('Failed to log BREAKOUT_ENDED event:', err);
    }

    await this.breakoutRoomRepository.removeAllForMeeting(meetingId);
    this.logger.debug(
      `All breakout rooms for meeting ${meetingId} have been hard deleted.`,
    );

    return { message: 'Breakout rooms closed' };
  }

  async getBreakoutToken(meetingId: string, userId: string) {
    this.logger.debug(
      `getBreakoutToken: searching for userId="${userId}" in meetingId="${meetingId}"`,
    );
    const rooms = await this.breakoutRoomRepository.findByMeetingId(meetingId);
    this.logger.debug(`Total rooms found: ${rooms.length}`);

    // Tìm phòng đang ACTIVE mà user này được gán vào
    let foundRoom: BreakoutRoom | null = null;
    let foundParticipant: BreakoutRoomParticipant | null = null;

    for (const r of rooms) {
      this.logger.debug(
        `Checking Room: "${r.name}" | Status: ${r.status} | Participants Count: ${r.participants?.length}`,
      );
      const p = r.participants?.find(
        (part) =>
          String(part.userId).toLowerCase().trim() ===
          String(userId).toLowerCase().trim(),
      );

      if (p) {
        this.logger.debug(
          `Found user in room "${r.name}". Room status is ${r.status}`,
        );
        foundParticipant = p;
        if (r.status === BreakoutRoomStatus.ACTIVE) {
          foundRoom = r;
          break; // Ưu tiên phòng đang Active
        }
      }
    }

    if (!foundRoom || !foundParticipant) {
      this.logger.debug(
        `No ACTIVE room found for user ${userId}. (RoomFound=${!!foundRoom}, ParticipantFound=${!!foundParticipant})`,
      );
      return null;
    }

    const room = foundRoom;
    const livekitRoomName = room.livekitRoomName;
    if (!livekitRoomName) {
      this.logger.debug(`Room livekitRoomName is not defined.`);
      return null;
    }
    const participant = foundParticipant;

    // Tên hiển thị
    const participantName =
      `${participant.user?.firstName || 'User'} ${participant.user?.lastName || ''}`.trim();

    // Metadata (chứa avatar)
    const metadata = JSON.stringify({
      picture: participant.user?.picture,
      firstName: participant.user?.firstName,
      lastName: participant.user?.lastName,
    });

    const grants = {
      roomJoin: true,
      room: livekitRoomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomRecord: false,
    };

    const token = await this.liveKitService.generateToken(
      livekitRoomName,
      userId,
      participantName,
      grants,
      metadata,
    );

    const cacheKey = `transitioning:${meetingId}:${userId}`;
    await this.cacheManager.set(cacheKey, livekitRoomName, 15000);

    return {
      token,
      roomName: room.name,
      livekitRoomName: room.livekitRoomName,
      isBreakoutRoom: true,
      roomId: room.id,
    };
  }

  async getHostBreakoutToken(
    meetingId: string,
    roomId: string,
    userId: string,
  ) {
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    if (meeting.organizerId !== userId) {
      throw new ForbiddenException(
        'Only the organizer can join breakout rooms as host',
      );
    }

    const room = await this.breakoutRoomRepository.findById(roomId);
    if (!room || room.meetingId !== meetingId) {
      throw new NotFoundException('Breakout room not found');
    }
    if (room.status !== BreakoutRoomStatus.ACTIVE || !room.livekitRoomName) {
      throw new BadRequestException('Breakout room is not active');
    }

    const organizer = meeting.organizer;
    const participantName =
      `${organizer?.firstName || 'Host'} ${organizer?.lastName || ''}`.trim();
    const metadata = JSON.stringify({
      picture: organizer?.picture,
      firstName: organizer?.firstName,
      lastName: organizer?.lastName,
      isOrganizer: true,
    });

    const grants = {
      roomJoin: true,
      room: room.livekitRoomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomRecord: true,
    };

    const token = await this.liveKitService.generateToken(
      room.livekitRoomName,
      userId,
      participantName,
      grants,
      metadata,
    );

    const cacheKey = `transitioning:${meetingId}:${userId}`;
    await this.cacheManager.set(cacheKey, room.livekitRoomName, 15000);

    return {
      token,
      roomName: room.name,
      livekitRoomName: room.livekitRoomName,
      isBreakoutRoom: true,
      roomId: room.id,
    };
  }

  async leaveBreakoutRoom(meetingId: string, userId: string): Promise<void> {
    await this.participantRepository.removeForUserInMeeting(userId, meetingId);
  }
}
