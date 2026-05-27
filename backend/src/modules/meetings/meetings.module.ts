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
  MeetingChatMessage,
} from './entities';

// Controllers
import { MeetingsController } from './controllers/meetings.controller';
import { ParticipantsController } from './controllers/participants.controller';
import { MeetingSessionsController } from './controllers/meeting-sessions.controller';
import { ChatController } from './controllers/chat.controller';

// Repositories
import { MeetingRepository } from './repositories/meeting.repository';
import { ParticipantRepository } from './repositories/participant.repository';
import { TranscriptRepository } from './repositories/transcript.repository';
import { MeetingRecordingRepository } from './repositories/meeting-recording.repository';
import { MeetingSessionRepository } from './repositories/meeting-session.repository';
import { MeetingChatMessageRepository } from './repositories/meeting-chat-message.repository';

// Services
import { MeetingsService } from './services/meetings.service';
import { ParticipantsService } from './services/participants.service';
import { MeetingSessionsService } from './services/meeting-sessions.service';
import { ChatService } from './services/chat.service';

// External modules
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
      MeetingSession,
      MeetingChatMessage,
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
    MeetingChatMessageRepository,
    // Services
    MeetingsService,
    ParticipantsService,
    MeetingSessionsService,
    ChatService,
  ],
  controllers: [
    MeetingsController,
    ParticipantsController,
    MeetingSessionsController,
    ChatController,
  ],
  exports: [
    MeetingsService,
    ParticipantsService,
    MeetingSessionsService,
    ChatService,
    MeetingRepository,
    ParticipantRepository,
    TranscriptRepository,
    MeetingRecordingRepository,
    MeetingSessionRepository,
    MeetingChatMessageRepository,
    TypeOrmModule,
  ],
})
export class MeetingsModule {}
