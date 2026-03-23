import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Meeting,
  Participant,
  TranscriptChunk,
  MeetingEvent,
  MeetingQuestion,
  MeetingPoll,
  Summary,
  Attachment,
  SummaryTemplate,
  Notification,
  AccessRequest,
  BreakoutRoom,
  BreakoutRoomParticipant,
  ChatHistory,
} from './entities';
import { MeetingsService } from './services/meetings.service';
import { MeetingsController } from './controllers/meetings.controller';
import { EventService } from './services/event.service';
import { QuestionService } from './services/question.service';
import { PollService } from './services/poll.service';
import { SummaryService } from './services/summary.service';
import { SummaryTemplateService } from './services/summary-template.service';
import { AttachmentService } from './services/attachment.service';
import { EventController } from './controllers/event.controller';
import { QuestionController } from './controllers/question.controller';
import { PollController } from './controllers/poll.controller';
import { SummaryController } from './controllers/summary.controller';
import { SummaryTemplateController } from './controllers/summary-template.controller';
import { AttachmentController } from './controllers/attachment.controller';
import { MeetingRepository } from './repositories/meeting.repository';
import { ParticipantRepository } from './repositories/participant.repository';
import { EventRepository } from './repositories/event.repository';
import { QuestionRepository } from './repositories/question.repository';
import { PollRepository } from './repositories/poll.repository';
import { SummaryRepository } from './repositories/summary.repository';
import { SummaryTemplateRepository } from './repositories/summary-template.repository';
import { AttachmentRepository } from './repositories/attachment.repository';
import { LiveKitModule } from '../../providers/livekit/livekit.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Meeting,
      Participant,
      TranscriptChunk,
      MeetingEvent,
      MeetingQuestion,
      MeetingPoll,
      Summary,
      SummaryTemplate,
      Attachment,
      Notification,
      AccessRequest,
      BreakoutRoom,
      BreakoutRoomParticipant,
      ChatHistory,
    ]),
    LiveKitModule,
    UsersModule,
  ],
  providers: [
    // Repositories
    MeetingRepository,
    ParticipantRepository,
    EventRepository,
    QuestionRepository,
    PollRepository,
    SummaryRepository,
    SummaryTemplateRepository,
    AttachmentRepository,
    // Services
    MeetingsService,
    EventService,
    QuestionService,
    PollService,
    SummaryService,
    SummaryTemplateService,
    AttachmentService,
  ],
  controllers: [
    MeetingsController,
    EventController,
    QuestionController,
    PollController,
    SummaryController,
    SummaryTemplateController,
    AttachmentController,
  ],
})
export class MeetingsModule {}
