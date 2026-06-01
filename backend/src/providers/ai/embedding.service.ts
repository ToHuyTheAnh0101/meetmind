import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface EmbeddingVector {
  embedding: number[];
  model: string;
}

@Injectable()
export class OllamaEmbeddingService {
  private readonly logger = new Logger(OllamaEmbeddingService.name);

  constructor(private configService: ConfigService) {
    const url = this.getOllamaUrl();
    const model = this.getModel();
    this.logger.log(`Ollama Embedding initialized: ${url} / model: ${model}`);
  }

  private getOllamaUrl(): string {
    return (
      this.configService.get<string>('OLLAMA_EMBEDDING_URL') ||
      'http://localhost:11434'
    );
  }

  private getModel(): string {
    return (
      this.configService.get<string>('OLLAMA_EMBEDDING_MODEL') ||
      'mxbai-embed-large'
    );
  }

  /**
   * Gọi Ollama /api/embeddings để embed 1 đoạn text.
   * Trả về vector (mảng số) với số chiều phụ thuộc model:
   */
  async embed(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const url = `${this.getOllamaUrl()}/api/embeddings`;
    const model = this.getModel();

    try {
      const response = await axios.post<EmbeddingVector>(
        url,
        {
          model,
          prompt: text.trim(),
          options: {
            // truncate: true, // nếu text quá dài, truncate theo context window của model
          },
        },
        {
          timeout: 30_000, // 30s timeout — Ollama local nhanh, nhưng chờ phòng trường hợp cold start
          // Ollama trả về JSON mỗi dòng khi stream, nhưng gửi { stream: false } hoặc
          // nhận về single object nếu model là embedding-only
        },
      );

      const vector = response.data.embedding;
      if (!Array.isArray(vector) || vector.length === 0) {
        this.logger.warn(`Ollama returned empty embedding for model ${model}`);
        return [];
      }

      return vector;
    } catch (error) {
      this.logger.error(
        `Failed to call Ollama embedding (${url}, model=${model}): ${error instanceof Error ? error.message : error}`,
      );
      // Không throw — cho phép transcript flow tiếp tục dù embedding fail
      // Backfill có thể chạy lại sau
      return [];
    }
  }

  /**
   * Embed batch — dùng cho backfill hoặc bulk insert.
   * Giới hạn concurrency để không overflow Ollama local.
   */
  async embedBatch(texts: string[], concurrency = 4): Promise<number[][]> {
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += concurrency) {
      const batch = texts.slice(i, i + concurrency);
      const embeddings = await Promise.all(batch.map((t) => this.embed(t)));
      results.push(...embeddings);
    }
    return results;
  }
}
