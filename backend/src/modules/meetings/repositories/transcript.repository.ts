import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TranscriptChunk } from '../entities';

@Injectable()
export class TranscriptRepository extends Repository<TranscriptChunk> {
  constructor(private dataSource: DataSource) {
    super(TranscriptChunk, dataSource.createEntityManager());
  }

  /**
   * Lấy toàn bộ bản dịch của một cuộc họp sắp xếp theo thời gian
   */
  async findByMeetingId(meetingId: string): Promise<TranscriptChunk[]> {
    return this.find({
      where: { meetingId },
      order: { startTime: 'ASC' },
    });
  }

  /**
   * Lấy toàn bộ bản dịch của một phiên họp thực tế sắp xếp theo thời gian
   */
  async findBySessionId(sessionId: string): Promise<TranscriptChunk[]> {
    return this.find({
      where: { sessionId },
      order: { startTime: 'ASC' },
    });
  }
}
