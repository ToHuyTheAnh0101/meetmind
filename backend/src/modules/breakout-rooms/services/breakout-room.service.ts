import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
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

@Injectable()
export class BreakoutRoomService {
  constructor(
    private readonly meetingRepository: MeetingRepository,
    private readonly breakoutRoomRepository: BreakoutRoomRepository,
    private readonly participantRepository: BreakoutRoomParticipantRepository,
    private readonly liveKitService: LiveKitService,
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
    for (const roomDto of dto.rooms) {
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
      console.log(
        `Created room ${savedRoom.name} with ${savedRoom.participants?.length || 0} participants`,
      );
    }

    // 3. Lấy lại toàn bộ danh sách phòng kèm participants để trả về
    const finalRooms =
      await this.breakoutRoomRepository.findByMeetingId(meetingId);
    console.log(`Returning ${finalRooms.length} rooms after setup.`);
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
      await this.liveKitService.createRoom(room.livekitRoomName);
    }

    return rooms;
  }

  async endBreakout(meetingId: string, userId: string) {
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) throw new NotFoundException('Meeting not found');
    if (meeting.organizerId !== userId)
      throw new ForbiddenException('Only organizer can end breakout');

    await this.breakoutRoomRepository.removeAllForMeeting(meetingId);
    console.log(
      `[DEBUG] All breakout rooms for meeting ${meetingId} have been hard deleted.`,
    );

    return { message: 'Breakout rooms closed' };
  }

  async getBreakoutToken(meetingId: string, userId: string) {
    console.log(
      `[DEBUG] getBreakoutToken: searching for userId="${userId}" in meetingId="${meetingId}"`,
    );
    const rooms = await this.breakoutRoomRepository.findByMeetingId(meetingId);
    console.log(`[DEBUG] Total rooms found: ${rooms.length}`);

    // Tìm phòng đang ACTIVE mà user này được gán vào
    let foundRoom: BreakoutRoom | null = null;
    let foundParticipant: BreakoutRoomParticipant | null = null;

    for (const r of rooms) {
      console.log(
        `[DEBUG] Checking Room: "${r.name}" | Status: ${r.status} | Participants Count: ${r.participants?.length}`,
      );
      const p = r.participants?.find(
        (part) =>
          String(part.userId).toLowerCase().trim() ===
          String(userId).toLowerCase().trim(),
      );

      if (p) {
        console.log(
          `[DEBUG] Found user in room "${r.name}". Room status is ${r.status}`,
        );
        foundParticipant = p;
        if (r.status === BreakoutRoomStatus.ACTIVE) {
          foundRoom = r;
          break; // Ưu tiên phòng đang Active
        }
      }
    }

    if (!foundRoom || !foundParticipant) {
      console.log(
        `[DEBUG] No ACTIVE room found for user ${userId}. (RoomFound=${!!foundRoom}, ParticipantFound=${!!foundParticipant})`,
      );
      return null;
    }

    const room = foundRoom;
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
      room: room.livekitRoomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomRecord: false,
    };

    const token = await this.liveKitService.generateToken(
      room.livekitRoomName,
      userId,
      participantName,
      grants,
      metadata,
    );

    return {
      token,
      roomName: room.name,
      livekitRoomName: room.livekitRoomName,
      isBreakoutRoom: true,
    };
  }
}
