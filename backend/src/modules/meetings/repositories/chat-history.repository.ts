import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatHistory } from '../entities/ai/chat-history.entity';

@Injectable()
export class ChatHistoryRepository {
  constructor(
    @InjectRepository(ChatHistory)
    private readonly repo: Repository<ChatHistory>,
  ) {}

  create(data: Partial<ChatHistory>): ChatHistory {
    return this.repo.create(data);
  }

  async save(chatHistory: Partial<ChatHistory>): Promise<ChatHistory> {
    return this.repo.save(chatHistory);
  }

  async findHistory(
    meetingId: string,
    userId: string,
    sessionId?: string,
  ): Promise<ChatHistory[]> {
    if (sessionId) {
      return this.repo.find({
        where: { meetingId, userId, sessionId },
        order: { createdAt: 'ASC' },
      });
    }
    return this.repo.find({
      where: { meetingId, userId },
      order: { createdAt: 'ASC' },
    });
  }
}
