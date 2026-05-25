import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Meeting,
  Participant,
  TranscriptChunk,
  MeetingRecording,
  Notification,
  AccessRequest,
  ChatHistory,
} from './entities';
import { MeetingsService } from './services/meetings.service';
import { MeetingsController } from './controllers/meetings.controller';
import { MeetingRepository } from './repositories/meeting.repository';
import { ParticipantRepository } from './repositories/participant.repository';
import { TranscriptRepository } from './repositories/transcript.repository';
import { MeetingRecordingRepository } from './repositories/meeting-recording.repository';
import { LiveKitModule } from '../../providers/livekit/livekit.module';
import { UsersModule } from '../users/users.module';
import { AiModule } from '../../providers/ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Meeting,
      Participant,
      TranscriptChunk,
      MeetingRecording,
      Notification,
      AccessRequest,
      ChatHistory,
    ]),
    LiveKitModule,
    UsersModule,
    AiModule,
  ],
  providers: [
    // Repositories
    MeetingRepository,
    ParticipantRepository,
    TranscriptRepository,
    MeetingRecordingRepository,
    // Services
    MeetingsService,
  ],
  controllers: [MeetingsController],
  exports: [
    MeetingsService,
    MeetingRepository,
    ParticipantRepository,
    TranscriptRepository,
    MeetingRecordingRepository,
    TypeOrmModule,
  ],
})
export class MeetingsModule {}
