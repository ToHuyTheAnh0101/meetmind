import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TranscriptChunk } from '../entities';

const DEFAULT_RAG_CHUNK_LIMIT = 8;

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

  /**
   * Tìm các đoạn transcript liên quan nhất theo embedding.
   */
  async findRelevantByEmbedding(
    meetingId: string,
    embedding: number[],
    limit = DEFAULT_RAG_CHUNK_LIMIT,
    sessionId?: string,
  ): Promise<TranscriptChunk[]> {
    if (!embedding.length) {
      return [];
    }

    const embeddingLiteral = `[${embedding.join(',')}]`;

    const qb = this.createQueryBuilder('chunk')
      .where('chunk.meetingId = :meetingId', { meetingId })
      .andWhere('chunk.embedding IS NOT NULL');

    if (sessionId) {
      qb.andWhere('chunk.sessionId = :sessionId', { sessionId });
    }

    return qb
      .orderBy('chunk.embedding <=> CAST(:embedding AS vector)', 'ASC')
      .addOrderBy('chunk.startTime', 'ASC')
      .setParameter('embedding', embeddingLiteral)
      .take(limit)
      .getMany();
  }
}
