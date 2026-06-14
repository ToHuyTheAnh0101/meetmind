import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingChatMessageRepository } from '../repositories/meeting-chat-message.repository';
import { MeetingChatMessage } from '../entities';
import { BreakoutRoomParticipant } from '../../breakout-rooms/entities/breakout-room-participant.entity';
import { BreakoutRoomStatus } from '../../breakout-rooms/entities/breakout-room.entity';

export interface ChatMessageDto {
  id: string;
  message: string;
  senderUserId: string;
  senderName: string;
  senderAvatar: string | null;
  createdAt: Date;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly chatMessageRepository: MeetingChatMessageRepository,
    @InjectRepository(BreakoutRoomParticipant)
    private readonly breakoutRoomParticipantRepo: Repository<BreakoutRoomParticipant>,
  ) {}

  private async resolveBreakoutRoomId(
    meetingId: string,
    userId: string,
    breakoutRoomId?: string,
  ): Promise<string | undefined> {
    if (!breakoutRoomId) return undefined;
    if (breakoutRoomId === 'current') {
      const assignment = await this.breakoutRoomParticipantRepo.findOne({
        where: {
          userId,
          breakoutRoom: {
            meetingId,
            status: BreakoutRoomStatus.ACTIVE,
          },
        },
        relations: ['breakoutRoom'],
      });
      return assignment?.breakoutRoomId || undefined;
    }
    return breakoutRoomId;
  }

  async saveChatMessage(
    meetingId: string,
    userId: string,
    message: string,
    breakoutRoomId?: string,
  ): Promise<MeetingChatMessage> {
    if (!message || typeof message !== 'string' || message.trim() === '') {
      throw new BadRequestException('Message cannot be empty');
    }

    const resolvedRoomId = await this.resolveBreakoutRoomId(
      meetingId,
      userId,
      breakoutRoomId,
    );

    const chatMsg = this.chatMessageRepository.create({
      meetingId,
      senderUserId: userId,
      message: message.trim(),
      breakoutRoomId: resolvedRoomId || undefined,
    });

    return this.chatMessageRepository.save(chatMsg);
  }

  async getChatMessages(
    meetingId: string,
    breakoutRoomId?: string,
    userId?: string,
  ): Promise<ChatMessageDto[]> {
    const resolvedRoomId = userId
      ? await this.resolveBreakoutRoomId(meetingId, userId, breakoutRoomId)
      : breakoutRoomId;

    const messages = await this.chatMessageRepository.findByMeeting(
      meetingId,
      resolvedRoomId,
    );

    return messages.map((m) => {
      const sender = m.sender;
      return {
        id: m.id || '',
        message: m.message || '',
        senderUserId: m.senderUserId || '',
        senderName: sender
          ? `${sender.firstName || ''} ${sender.lastName || ''}`.trim()
          : m.senderUserId || 'Unknown',
        senderAvatar: sender?.picture ?? null,
        createdAt: m.createdAt || new Date(),
      };
    });
  }
}
