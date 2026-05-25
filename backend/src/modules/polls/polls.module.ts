import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingPoll } from './entities/meeting-poll.entity';
import { PollController } from './controllers/poll.controller';
import { PollService } from './services/poll.service';
import { PollRepository } from './repositories/poll.repository';
import { MeetingsModule } from '../meetings/meetings.module';

@Module({
  imports: [TypeOrmModule.forFeature([MeetingPoll]), MeetingsModule],
  providers: [PollRepository, PollService],
  controllers: [PollController],
  exports: [PollService, PollRepository],
})
export class PollsModule {}
