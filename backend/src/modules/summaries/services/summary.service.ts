import { Injectable, NotFoundException } from '@nestjs/common';
import { Summary } from '../entities/summary.entity';
import { SummaryRepository } from '../repositories/summary.repository';
import { MeetingRepository } from '../../meetings/repositories/meeting.repository';
import { TranscriptRepository } from '../../meetings/repositories/transcript.repository';
import { AiService } from '../../../providers/ai/ai.service';

@Injectable()
export class SummaryService {
  constructor(
    private summaryRepository: SummaryRepository,
    private meetingRepository: MeetingRepository,
    private transcriptRepository: TranscriptRepository,
    private aiService: AiService,
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

  async generateAiSummary(meetingId: string): Promise<Summary> {
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    const transcriptChunks =
      await this.transcriptRepository.findByMeetingId(meetingId);
    const transcriptText =
      transcriptChunks.map((c) => c.content).join('\n') ||
      `Không có bản dịch thoại trực tiếp. Đây là cuộc họp "${meeting.title}" với mô tả: ${meeting.description || 'Không có mô tả'}.`;

    const summaryText = await this.aiService.generateSummary(
      meeting.title,
      transcriptText,
    );

    let summary =
      await this.summaryRepository.findOverallByMeetingId(meetingId);
    if (summary) {
      summary.summaryText = summaryText;
    } else {
      summary = this.summaryRepository.create({
        meetingId,
        summaryText,
      });
    }

    return this.summaryRepository.save(summary);
  }
}
