import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ScreenCapture } from '../entities';

// Cosine distance threshold cho ảnh: 0 = giống nhau hoàn toàn, 1 = khác nhau hoàn toàn
// Ngưỡng 0.6 đủ rộng để bắt được các ảnh liên quan về mặt ngữ nghĩa
const IMAGE_SIMILARITY_THRESHOLD = 0.6;

@Injectable()
export class ScreenCaptureRepository extends Repository<ScreenCapture> {
  constructor(private dataSource: DataSource) {
    super(ScreenCapture, dataSource.createEntityManager());
  }

  async findByMeetingId(meetingId: string): Promise<ScreenCapture[]> {
    return this.find({
      where: { meetingId },
      order: { timestamp: 'ASC' },
    });
  }

  async findById(id: string): Promise<ScreenCapture | null> {
    return this.findOne({ where: { id } });
  }

  /**
   * Tìm kiếm ảnh chụp màn hình theo vector embedding (semantic search).
   * Chỉ trả về ảnh có summary (ảnh có ý nghĩa, không phải ảnh rác).
   * Dùng toán tử cosine distance (<=> ) của pgvector.
   */
  async findRelevantByEmbedding(
    meetingId: string,
    embedding: number[],
    limit = 5,
  ): Promise<ScreenCapture[]> {
    if (!embedding.length) return [];

    const embeddingLiteral = `[${embedding.join(',')}]`;

    return this.createQueryBuilder('capture')
      .where('capture.meetingId = :meetingId', { meetingId })
      .andWhere('capture.embedding IS NOT NULL')
      .andWhere('capture.summary IS NOT NULL')
      .andWhere(
        '(capture.embedding <=> CAST(:embedding AS vector)) < :threshold',
        { threshold: IMAGE_SIMILARITY_THRESHOLD },
      )
      .orderBy('capture.embedding <=> CAST(:embedding AS vector)', 'ASC')
      .setParameter('embedding', embeddingLiteral)
      .take(limit)
      .getMany();
  }
}

