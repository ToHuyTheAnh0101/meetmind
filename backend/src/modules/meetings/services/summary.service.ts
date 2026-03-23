import { Injectable, NotFoundException } from '@nestjs/common';
import { Summary } from '../entities';
import { SummaryRepository } from '../repositories/summary.repository';
import { MeetingRepository } from '../repositories/meeting.repository';

@Injectable()
export class SummaryService {
  constructor(
    private summaryRepository: SummaryRepository,
    private meetingRepository: MeetingRepository,
  ) {}

  async create(meetingId: string, data: Partial<Summary>): Promise<Summary> {
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    const summary = this.summaryRepository.create({
      ...data,
      meetingId,
    });

    return this.summaryRepository.save(summary);
  }

  async findById(id: string): Promise<Summary> {
    const summary = await this.summaryRepository.findById(id);
    if (!summary) {
      throw new NotFoundException('Summary not found');
    }
    return summary;
  }

  async findByMeetingId(meetingId: string): Promise<Summary[]> {
    return this.summaryRepository.findByMeetingId(meetingId);
  }

  async findOverallSummary(meetingId: string): Promise<Summary | null> {
    return this.summaryRepository.findOverallByMeetingId(meetingId);
  }

  async update(id: string, data: Partial<Summary>): Promise<Summary> {
    const summary = await this.findById(id);
    Object.assign(summary, data);
    return this.summaryRepository.save(summary);
  }

  async remove(id: string): Promise<void> {
    const summary = await this.findById(id);
    await this.summaryRepository.remove(summary);
  }
}
