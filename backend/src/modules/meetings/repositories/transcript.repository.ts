import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TranscriptChunk } from '../entities';

// Cosine distance threshold: 0 = identical, 1 = completely different
// Chunks with distance >= this value are considered irrelevant
const SIMILARITY_DISTANCE_THRESHOLD = 0.55;
const DEFAULT_RAG_CHUNK_LIMIT = 8;
// Fallback: lấy N chunks gần nhất về thời gian khi không có kết quả vector search
const FALLBACK_RECENT_CHUNKS = 25;

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
   * Tìm các đoạn transcript liên quan nhất theo embedding.
   * Chỉ trả về các chunk có cosine distance < SIMILARITY_DISTANCE_THRESHOLD
   * để loại bỏ các chunk không liên quan dù vẫn nằm trong top-k.
   */
  async findRelevantByEmbedding(
    meetingId: string,
    embedding: number[],
    limit = DEFAULT_RAG_CHUNK_LIMIT,
  ): Promise<TranscriptChunk[]> {
    if (!embedding.length) {
      return [];
    }

    const embeddingLiteral = `[${embedding.join(',')}]`;

    const qb = this.createQueryBuilder('chunk')
      .where('chunk.meetingId = :meetingId', { meetingId })
      .andWhere('chunk.embedding IS NOT NULL')
      // Lọc theo similarity threshold: chỉ lấy chunk thực sự liên quan
      .andWhere(
        '(chunk.embedding <=> CAST(:embedding AS vector)) < :threshold',
        { threshold: SIMILARITY_DISTANCE_THRESHOLD },
      );

    return qb
      .orderBy('chunk.embedding <=> CAST(:embedding AS vector)', 'ASC')
      .addOrderBy('chunk.startTime', 'ASC')
      .setParameter('embedding', embeddingLiteral)
      .take(limit)
      .getMany();
  }

  /**
   * Fallback: Lấy N chunks gần đây nhất (theo thời gian) của cuộc họp.
   * Dùng khi vector search không trả về kết quả nào vượt threshold.
   */
  async findRecentChunks(
    meetingId: string,
    limit = FALLBACK_RECENT_CHUNKS,
  ): Promise<TranscriptChunk[]> {
    const chunks = await this.find({
      where: { meetingId },
      order: { startTime: 'DESC' },
      take: limit,
    });

    // Trả về theo thứ tự thời gian tăng dần để AI đọc tự nhiên hơn
    return chunks.reverse();
  }
}
