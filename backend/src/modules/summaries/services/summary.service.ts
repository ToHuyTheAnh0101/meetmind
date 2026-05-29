import { Injectable, NotFoundException } from '@nestjs/common';
import { Summary } from '../entities/summary.entity';
import { SummaryRepository } from '../repositories/summary.repository';
import { SummaryTemplateRepository } from '../repositories/summary-template.repository';
import { MeetingRepository } from '../../meetings/repositories/meeting.repository';
import { TranscriptRepository } from '../../meetings/repositories/transcript.repository';
import { AiService } from '../../../providers/ai/ai.service';

@Injectable()
export class SummaryService {
  constructor(
    private summaryRepository: SummaryRepository,
    private meetingRepository: MeetingRepository,
    private transcriptRepository: TranscriptRepository,
    private summaryTemplateRepository: SummaryTemplateRepository,
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

  async generateAiSummary(
    meetingId: string,
    sessionId?: string,
    templateId?: string,
  ): Promise<Summary> {
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    const resolvedTemplateId = templateId || meeting.templateId;

    // 1. Immediately find or create a summary record and set status to '[GENERATING]'
    let summary = sessionId
      ? await this.summaryRepository.findBySessionId(sessionId)
      : await this.summaryRepository.findOverallByMeetingId(meetingId);

    if (summary) {
      summary.summaryText = '[GENERATING]';
      summary.templateId = resolvedTemplateId;
    } else {
      summary = this.summaryRepository.create({
        meetingId,
        sessionId,
        summaryText: '[GENERATING]',
        templateId: resolvedTemplateId,
      });
    }
    const savedSummary = await this.summaryRepository.save(summary);

    // 2. Launch AI summarization as an asynchronous non-blocking background job
    this.transcriptRepository
      .findBySessionId(sessionId || '')
      .then(async (transcriptChunks) => {
        // If sessionId was not passed, fallback to meeting-wide transcripts
        const chunks = sessionId
          ? transcriptChunks
          : await this.transcriptRepository.findByMeetingId(meetingId);

        const transcriptText =
          chunks.map((c) => c.content).join('\n') ||
          `Không có bản dịch thoại trực tiếp. Đây là cuộc họp "${meeting.title}" với mô tả: ${meeting.description || 'Không có mô tả'}.`;

        return this.generateSummaryTextInBackground(
          meeting.title,
          transcriptText,
          resolvedTemplateId,
        );
      })
      .then(async (summaryText) => {
        // Update the DB record with the actual text
        const current = sessionId
          ? await this.summaryRepository.findBySessionId(sessionId)
          : await this.summaryRepository.findOverallByMeetingId(meetingId);

        if (current) {
          current.summaryText = summaryText;
          await this.summaryRepository.save(current);
        }
      })
      .catch((err) => {
        console.error('[Background Summary] Failed to generate:', err);
        // On error, clear the placeholder so user can regenerate
        this.resetGeneratingSummaryOnError(meetingId, sessionId);
      });

    return savedSummary;
  }

  private async generateSummaryTextInBackground(
    title: string,
    transcriptText: string,
    resolvedTemplateId?: string,
  ): Promise<string> {
    if (resolvedTemplateId) {
      try {
        const template =
          await this.summaryTemplateRepository.findById(resolvedTemplateId);
        if (template) {
          return await this.aiService.generateSummaryWithTemplate(
            title,
            transcriptText,
            template,
          );
        }
      } catch {
        // Fallback to standard
      }
    }
    return await this.aiService.generateSummary(title, transcriptText);
  }

  private async resetGeneratingSummaryOnError(
    meetingId: string,
    sessionId?: string,
  ) {
    try {
      const current = sessionId
        ? await this.summaryRepository.findBySessionId(sessionId)
        : await this.summaryRepository.findOverallByMeetingId(meetingId);

      if (current && current.summaryText === '[GENERATING]') {
        await this.summaryRepository.remove(current);
      }
    } catch (err) {
      console.error('[Background Summary] Failed to reset on error:', err);
    }
  }
}
