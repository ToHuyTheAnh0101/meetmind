import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetLog } from './entities/meet-log.entity';
import { MeetLogRepository } from './repositories/meet-log.repository';
import { MeetLogService } from './services/meet-log.service';
import { MeetLogController } from './controllers/meet-log.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MeetLog])],
  providers: [MeetLogRepository, MeetLogService],
  controllers: [MeetLogController],
  exports: [MeetLogService, MeetLogRepository],
})
export class MeetLogsModule {}
