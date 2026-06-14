import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingQuestion } from './entities/meeting-question.entity';
import { MeetingAnswer } from './entities/meeting-answer.entity';
import { QuestionController } from './controllers/question.controller';
import { QuestionService } from './services/question.service';
import { QuestionRepository } from './repositories/question.repository';
import { MeetingsModule } from '../meetings/meetings.module';
import { BreakoutRoomParticipant } from '../breakout-rooms/entities/breakout-room-participant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MeetingQuestion,
      MeetingAnswer,
      BreakoutRoomParticipant,
    ]),
    MeetingsModule,
  ],
  providers: [QuestionRepository, QuestionService],
  controllers: [QuestionController],
  exports: [QuestionService, QuestionRepository],
})
export class QaModule {}
