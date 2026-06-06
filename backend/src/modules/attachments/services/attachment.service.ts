import { Injectable, NotFoundException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { Attachment } from '../entities/attachment.entity';
import { AttachmentRepository } from '../repositories/attachment.repository';
import { MeetingRepository } from '../../meetings/repositories/meeting.repository';

@Injectable()
export class AttachmentService {
  constructor(
    private attachmentRepository: AttachmentRepository,
    private meetingRepository: MeetingRepository,
  ) {}

  async create(
    meetingId: string,
    data: Partial<Attachment>,
  ): Promise<Attachment> {
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    const attachment = this.attachmentRepository.create({
      ...data,
      meetingId,
    });

    return this.attachmentRepository.save(attachment);
  }

  async findById(id: string): Promise<Attachment> {
    const attachment = await this.attachmentRepository.findById(id);
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }
    return attachment;
  }

  async findByMeetingId(meetingId: string): Promise<Attachment[]> {
    return this.attachmentRepository.findByMeetingId(meetingId);
  }

  async updateUrl(id: string, fileUrl: string): Promise<Attachment> {
    const attachment = await this.findById(id);
    attachment.fileUrl = fileUrl;
    return this.attachmentRepository.save(attachment);
  }

  async remove(id: string): Promise<void> {
    const attachment = await this.findById(id);

    // Delete physical file from disk
    try {
      if (attachment.meetingId && attachment.id) {
        const filePath = path.join(
          process.cwd(),
          'uploads',
          'attachments',
          attachment.meetingId,
          attachment.id,
        );
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (err) {
      console.warn(`Failed to delete physical file for attachment ${id}:`, err);
    }

    await this.attachmentRepository.remove(attachment);
  }
}
