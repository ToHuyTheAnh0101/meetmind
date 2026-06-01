import { Module } from '@nestjs/common';
import { AiService } from './ai.service.js';
import { OllamaEmbeddingService } from './embedding.service.js';

@Module({
  providers: [AiService, OllamaEmbeddingService],
  exports: [AiService, OllamaEmbeddingService],
})
export class AiModule {}
