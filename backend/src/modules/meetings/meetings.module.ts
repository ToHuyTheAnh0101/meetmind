import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Meeting,
  Participant,
  TranscriptChunk,
  MeetingRecording,
  Notification,
  AccessRequest,
  ChatHistory,
  MeetingSession,
} from './entities';
import { MeetingsService } from './services/meetings.service';
import { MeetingsController } from './controllers/meetings.controller';
import { MeetingRepository } from './repositories/meeting.repository';
import { ParticipantRepository } from './repositories/participant.repository';
import { TranscriptRepository } from './repositories/transcript.repository';
import { MeetingRecordingRepository } from './repositories/meeting-recording.repository';
import { MeetingSessionRepository } from './repositories/meeting-session.repository';
import { LiveKitModule } from '../../providers/livekit/livekit.module';
import { UsersModule } from '../users/users.module';
import { AiModule } from '../../providers/ai/ai.module';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: false,
    }),
    TypeOrmModule.forFeature([
      Meeting,
      Participant,
      TranscriptChunk,
      MeetingRecording,
      Notification,
      AccessRequest,
      ChatHistory,
      // session entity
      MeetingSession,
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
    MeetingSessionRepository,
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
    MeetingSessionRepository,
    TypeOrmModule,
  ],
})
export class MeetingsModule {}
