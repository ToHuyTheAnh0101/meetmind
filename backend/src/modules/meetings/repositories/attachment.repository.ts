import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment } from '../entities';

@Injectable()
export class AttachmentRepository {
  constructor(
    @InjectRepository(Attachment)
    private readonly repo: Repository<Attachment>,
  ) {}

  async findById(id: string): Promise<Attachment | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['uploadedByUser'],
    });
  }

  async findByMeetingId(meetingId: string): Promise<Attachment[]> {
    return this.repo.find({
      where: { meetingId },
      relations: ['uploadedByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  create(data: Partial<Attachment>): Attachment {
    return this.repo.create(data);
  }

  async save(attachment: Partial<Attachment>): Promise<Attachment> {
    return this.repo.save(attachment);
  }

  async remove(attachment: Attachment): Promise<void> {
    await this.repo.remove(attachment);
  }
}
