import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Meeting,
  Participant,
  TranscriptChunk,
  ChatHistory,
  MeetingChatMessage,
  ScreenCapture,
} from './entities';
import { BreakoutRoomParticipant } from '../breakout-rooms/entities/breakout-room-participant.entity';

// Controllers
import { MeetingsController } from './controllers/meetings.controller';
import { ParticipantsController } from './controllers/participants.controller';
import { ChatController } from './controllers/chat.controller';

// Repositories
import { MeetingRepository } from './repositories/meeting.repository';
import { ParticipantRepository } from './repositories/participant.repository';
import { TranscriptRepository } from './repositories/transcript.repository';
import { MeetingChatMessageRepository } from './repositories/meeting-chat-message.repository';
import { ChatHistoryRepository } from './repositories/chat-history.repository';
import { ScreenCaptureRepository } from './repositories/screen-capture.repository';

// Services
import { MeetingsService } from './services/meetings.service';
import { ParticipantsService } from './services/participants.service';
import { ChatService } from './services/chat.service';
import { MeetingsWebhookService } from './services/meetings-webhook.service';

// External modules
import { LiveKitModule } from '../../providers/livekit/livekit.module';
import { UsersModule } from '../users/users.module';
import { AiModule } from '../../providers/ai/ai.module';
import { CloudinaryModule } from '../../providers/cloudinary/cloudinary.module';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: false,
    }),
    TypeOrmModule.forFeature([
      Meeting,
      Participant,
      TranscriptChunk,
      ChatHistory,
      MeetingChatMessage,
      ScreenCapture,
      BreakoutRoomParticipant,
    ]),
    LiveKitModule,
    UsersModule,
    AiModule,
    CloudinaryModule,
  ],
  providers: [
    // Repositories
    MeetingRepository,
    ParticipantRepository,
    TranscriptRepository,
    MeetingChatMessageRepository,
    ChatHistoryRepository,
    ScreenCaptureRepository,
    // Services
    MeetingsService,
    ParticipantsService,
    ChatService,
    MeetingsWebhookService,
  ],
  controllers: [MeetingsController, ParticipantsController, ChatController],
  exports: [
    MeetingsWebhookService,
    MeetingsService,
    ParticipantsService,
    ChatService,
    MeetingRepository,
    ParticipantRepository,
    TranscriptRepository,
    MeetingChatMessageRepository,
    ChatHistoryRepository,
    ScreenCaptureRepository,
    TypeOrmModule,
  ],
})
export class MeetingsModule {}
