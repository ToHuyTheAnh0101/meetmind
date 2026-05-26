import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Summary } from './entities/summary.entity';
import { SummaryTemplate } from './entities/summary-template.entity';
import { SummaryController } from './controllers/summary.controller';
import { SummaryTemplateController } from './controllers/summary-template.controller';
import { SummaryService } from './services/summary.service';
import { SummaryTemplateService } from './services/summary-template.service';
import { SummaryRepository } from './repositories/summary.repository';
import { SummaryTemplateRepository } from './repositories/summary-template.repository';
import { MeetingsModule } from '../meetings/meetings.module';
import { AiModule } from '../../providers/ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Summary, SummaryTemplate]),
    MeetingsModule,
    AiModule,
  ],
  providers: [
    SummaryRepository,
    SummaryTemplateRepository,
    SummaryService,
    SummaryTemplateService,
  ],
  controllers: [SummaryController, SummaryTemplateController],
  exports: [
    SummaryService,
    SummaryTemplateService,
    SummaryRepository,
    SummaryTemplateRepository,
  ],
})
export class SummariesModule {}
