import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ChatService, ChatMessageDto } from '../services/chat.service';

@Controller('meetings')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post(':id/chat-messages')
  @UseGuards(JwtAuthGuard)
  async saveChatMessage(
    @Param('id') id: string,
    @Body('message') message: string,
    @Body('breakoutRoomId') breakoutRoomId: string,
    @Request() req: { user: { id: string } },
  ) {
    if (!message || typeof message !== 'string' || message.trim() === '') {
      throw new BadRequestException('Message cannot be empty');
    }
    return this.chatService.saveChatMessage(
      id,
      req.user.id,
      message,
      breakoutRoomId,
    );
  }

  @Get(':id/chat-messages')
  @UseGuards(JwtAuthGuard)
  async getChatMessages(
    @Param('id') id: string,
    @Query('breakoutRoomId') breakoutRoomId: string,
  ): Promise<ChatMessageDto[]> {
    return this.chatService.getChatMessages(id, breakoutRoomId);
  }
}
