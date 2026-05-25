import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingEvent } from './entities/meeting-event.entity';
import { EventController } from './controllers/event.controller';
import { EventService } from './services/event.service';
import { EventRepository } from './repositories/event.repository';
import { MeetingsModule } from '../meetings/meetings.module';

@Module({
  imports: [TypeOrmModule.forFeature([MeetingEvent]), MeetingsModule],
  providers: [EventRepository, EventService],
  controllers: [EventController],
  exports: [EventService, EventRepository],
})
export class EventsModule {}
