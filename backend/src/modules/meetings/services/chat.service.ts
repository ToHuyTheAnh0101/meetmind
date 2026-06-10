import { Injectable, BadRequestException } from '@nestjs/common';
import { MeetingChatMessageRepository } from '../repositories/meeting-chat-message.repository';
import { MeetingChatMessage } from '../entities';

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
  ) {}

  async saveChatMessage(
    meetingId: string,
    userId: string,
    message: string,
    breakoutRoomId?: string,
  ): Promise<MeetingChatMessage> {
    if (!message || typeof message !== 'string' || message.trim() === '') {
      throw new BadRequestException('Message cannot be empty');
    }

    const chatMsg = this.chatMessageRepository.create({
      meetingId,
      senderUserId: userId,
      message: message.trim(),
      breakoutRoomId: breakoutRoomId || undefined,
    });

    return this.chatMessageRepository.save(chatMsg);
  }

  async getChatMessages(
    meetingId: string,
    breakoutRoomId?: string,
  ): Promise<ChatMessageDto[]> {
    const messages = await this.chatMessageRepository.findByMeeting(
      meetingId,
      breakoutRoomId,
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
