import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface EmbeddingVector {
  embedding: number[];
  model: string;
}

@Injectable()
export class OllamaEmbeddingService {
  private readonly logger = new Logger(OllamaEmbeddingService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(private configService: ConfigService) {
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (geminiKey) {
      this.genAI = new GoogleGenerativeAI(geminiKey);
      this.logger.log(
        'Embedding initialized: Gemini gemini-embedding-001 (1024 dimensions)',
      );
    } else {
      this.logger.warn('GEMINI_API_KEY not set — embedding disabled.');
    }
  }

  /**
   * Embed một đoạn text bằng Gemini gemini-embedding-001.
   * Trả về vector 1024 chiều, hoặc [] nếu chưa cấu hình / lỗi.
   */
  async embed(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) return [];
    if (!this.genAI) return [];

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-embedding-001',
      });

      const result = await model.embedContent({
        content: { role: 'user', parts: [{ text: text.trim() }] },
        // @ts-expect-error: outputDimensionality is supported in the API but missing in legacy SDK typings
        outputDimensionality: 1024,
      });
      const vector = result.embedding?.values;

      if (!Array.isArray(vector) || vector.length === 0) {
        this.logger.warn('Gemini returned empty embedding vector');
        return [];
      }

      return vector;
    } catch (error) {
      this.logger.error(
        `Gemini embedding failed: ${error instanceof Error ? error.message : error}`,
      );
      // Không throw — transcript flow tiếp tục bình thường
      return [];
    }
  }

  /**
   * Embed batch — giới hạn concurrency để tránh vượt quota Gemini.
   */
  async embedBatch(texts: string[], concurrency = 3): Promise<number[][]> {
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += concurrency) {
      const batch = texts.slice(i, i + concurrency);
      const embeddings = await Promise.all(batch.map((t) => this.embed(t)));
      results.push(...embeddings);
    }
    return results;
  }
}
