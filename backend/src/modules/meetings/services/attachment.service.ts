import { Injectable, NotFoundException } from '@nestjs/common';
import { Attachment } from '../entities';
import { AttachmentRepository } from '../repositories/attachment.repository';
import { MeetingRepository } from '../repositories/meeting.repository';

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

  async remove(id: string): Promise<void> {
    const attachment = await this.findById(id);
    await this.attachmentRepository.remove(attachment);
  }
}
