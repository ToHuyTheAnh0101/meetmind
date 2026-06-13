import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetLog } from './entities/meet-log.entity';
import { MeetLogRepository } from './repositories/meet-log.repository';
import { MeetLogService } from './services/meet-log.service';
import { MeetLogController } from './controllers/meet-log.controller';
import { MeetingsModule } from '../meetings/meetings.module';

@Module({
  imports: [TypeOrmModule.forFeature([MeetLog]), MeetingsModule],
  providers: [MeetLogRepository, MeetLogService],
  controllers: [MeetLogController],
  exports: [MeetLogService, MeetLogRepository],
})
export class MeetLogsModule {}
