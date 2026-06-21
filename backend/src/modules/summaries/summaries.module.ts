import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Summary } from './entities/summary.entity';
import { SummaryTemplate } from './entities/summary-template.entity';
import { ChatHistory } from './entities/chat-history.entity';
import { SummaryController } from './controllers/summary.controller';
import { SummaryTemplateController } from './controllers/summary-template.controller';
import { AiChatController } from './controllers/ai-chat.controller';
import { SummaryService } from './services/summary.service';
import { SummaryTemplateService } from './services/summary-template.service';
import { AiChatService } from './services/ai-chat.service';
import { SummaryRepository } from './repositories/summary.repository';
import { SummaryTemplateRepository } from './repositories/summary-template.repository';
import { ChatHistoryRepository } from './repositories/chat-history.repository';
import { MeetingsModule } from '../meetings/meetings.module';
import { PollsModule } from '../polls/polls.module';
import { QaModule } from '../qa/qa.module';
import { AiModule } from '../../providers/ai/ai.module';
import { MeetLogsModule } from '../meetlogs/meetlogs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Summary, SummaryTemplate, ChatHistory]),
    MeetingsModule,
    PollsModule,
    QaModule,
    AiModule,
    MeetLogsModule,
  ],
  providers: [
    SummaryRepository,
    SummaryTemplateRepository,
    ChatHistoryRepository,
    SummaryService,
    SummaryTemplateService,
    AiChatService,
  ],
  controllers: [SummaryController, SummaryTemplateController, AiChatController],
  exports: [
    SummaryService,
    SummaryTemplateService,
    AiChatService,
    SummaryRepository,
    SummaryTemplateRepository,
    ChatHistoryRepository,
  ],
})
export class SummariesModule {}
