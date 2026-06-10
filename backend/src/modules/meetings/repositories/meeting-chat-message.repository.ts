import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingChatMessage } from '../entities/core/chat-message.entity';

@Injectable()
export class MeetingChatMessageRepository {
  constructor(
    @InjectRepository(MeetingChatMessage)
    private readonly repo: Repository<MeetingChatMessage>,
  ) {}

  create(data: Partial<MeetingChatMessage>): MeetingChatMessage {
    return this.repo.create(data);
  }

  async save(
    message: Partial<MeetingChatMessage>,
  ): Promise<MeetingChatMessage> {
    const saved = await this.repo.save(message);
    // Reload to get relations (like sender)
    const reloaded = await this.repo.findOne({
      where: { id: saved.id },
      relations: ['sender'],
    });
    if (!reloaded) {
      throw new Error('Failed to reload saved chat message');
    }
    return reloaded;
  }

  async findByMeeting(
    meetingId: string,
    breakoutRoomId?: string,
  ): Promise<MeetingChatMessage[]> {
    const queryBuilder = this.repo
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.sender', 'sender')
      .where('chat.meetingId = :meetingId', { meetingId });

    if (breakoutRoomId) {
      queryBuilder.andWhere('chat.breakoutRoomId = :breakoutRoomId', {
        breakoutRoomId,
      });
    } else {
      queryBuilder.andWhere('chat.breakoutRoomId IS NULL');
    }

    return queryBuilder.orderBy('chat.createdAt', 'ASC').getMany();
  }
}
