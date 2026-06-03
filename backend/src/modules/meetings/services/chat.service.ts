import { Injectable, BadRequestException } from '@nestjs/common';
import { MeetingChatMessageRepository } from '../repositories/meeting-chat-message.repository';
import { MeetingSessionsService } from './meeting-sessions.service';
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
    private readonly sessionsService: MeetingSessionsService,
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

    const session =
      await this.sessionsService.ensureSessionForMeeting(meetingId);

    const chatMsg = this.chatMessageRepository.create({
      sessionId: session.id,
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
    const session =
      await this.sessionsService.ensureSessionForMeeting(meetingId);
    const messages = await this.chatMessageRepository.findBySession(
      session.id,
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
