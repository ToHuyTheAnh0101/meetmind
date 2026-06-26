import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingPoll } from './entities/meeting-poll.entity';
import { PollOption } from './entities/poll-option.entity';
import { PollVote } from './entities/poll-vote.entity';
import { PollController } from './controllers/poll.controller';
import { PollService } from './services/poll.service';
import { PollRepository } from './repositories/poll.repository';
import { MeetingsModule } from '../meetings/meetings.module';
import { MeetLogsModule } from '../meetlogs/meetlogs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MeetingPoll, PollOption, PollVote]),
    MeetingsModule,
    MeetLogsModule,
  ],
  providers: [PollRepository, PollService],
  controllers: [PollController],
  exports: [PollService, PollRepository],
})
export class PollsModule {}
