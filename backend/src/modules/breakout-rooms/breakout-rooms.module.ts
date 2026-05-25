import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BreakoutRoom } from './entities/breakout-room.entity';
import { BreakoutRoomParticipant } from './entities/breakout-room-participant.entity';
import { BreakoutRoomController } from './controllers/breakout-room.controller';
import { BreakoutRoomService } from './services/breakout-room.service';
import { BreakoutRoomRepository } from './repositories/breakout-room.repository';
import { BreakoutRoomParticipantRepository } from './repositories/breakout-room-participant.repository';
import { MeetingsModule } from '../meetings/meetings.module';
import { LiveKitModule } from '../../providers/livekit/livekit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BreakoutRoom, BreakoutRoomParticipant]),
    MeetingsModule,
    LiveKitModule,
  ],
  providers: [
    BreakoutRoomRepository,
    BreakoutRoomParticipantRepository,
    BreakoutRoomService,
  ],
  controllers: [BreakoutRoomController],
  exports: [
    BreakoutRoomService,
    BreakoutRoomRepository,
    BreakoutRoomParticipantRepository,
  ],
})
export class BreakoutRoomsModule {}
