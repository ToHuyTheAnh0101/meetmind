import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Summary } from '../entities';

@Injectable()
export class SummaryRepository {
  constructor(
    @InjectRepository(Summary)
    private readonly repo: Repository<Summary>,
  ) {}

  async findById(id: string): Promise<Summary | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['agendaItem'],
    });
  }

  async findByMeetingId(meetingId: string): Promise<Summary[]> {
    return this.repo.find({
      where: { meetingId },
      relations: ['agendaItem'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOverallByMeetingId(meetingId: string): Promise<Summary | null> {
    return this.repo.findOne({
      where: { meetingId },
    });
  }

  create(data: Partial<Summary>): Summary {
    return this.repo.create(data);
  }

  async save(summary: Partial<Summary>): Promise<Summary> {
    return this.repo.save(summary);
  }

  async remove(summary: Summary): Promise<void> {
    await this.repo.remove(summary);
  }
}
