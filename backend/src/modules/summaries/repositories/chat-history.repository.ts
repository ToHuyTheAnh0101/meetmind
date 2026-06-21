import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatHistory } from '../entities/chat-history.entity';

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

  async findHistory(meetingId: string, userId: string): Promise<ChatHistory[]> {
    return this.repo.find({
      where: { meetingId, userId },
      order: { createdAt: 'ASC' },
    });
  }
}
