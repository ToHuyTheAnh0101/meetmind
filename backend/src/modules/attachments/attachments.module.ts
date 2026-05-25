import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attachment } from './entities/attachment.entity';
import { AttachmentController } from './controllers/attachment.controller';
import { AttachmentService } from './services/attachment.service';
import { AttachmentRepository } from './repositories/attachment.repository';
import { MeetingsModule } from '../meetings/meetings.module';

@Module({
  imports: [TypeOrmModule.forFeature([Attachment]), MeetingsModule],
  providers: [AttachmentRepository, AttachmentService],
  controllers: [AttachmentController],
  exports: [AttachmentService, AttachmentRepository],
})
export class AttachmentsModule {}
