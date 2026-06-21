import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import * as express from 'express';
import { AiChatService } from '../services/ai-chat.service';
import { MeetingsService } from '../../meetings/services/meetings.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

interface RequestWithUser {
  user: {
    id: string;
    email: string;
  };
}

@Controller('meetings')
export class AiChatController {
  constructor(
    private readonly aiChatService: AiChatService,
    private readonly meetingsService: MeetingsService,
  ) {}

  @Post(':id/chat')
  @UseGuards(JwtAuthGuard)
  async chatWithAI(
    @Param('id') id: string,
    @Body('question') question: string,
    @Request() req: { user: { id: string } },
  ): Promise<{ answer: string }> {
    return this.aiChatService.chatWithAI(id, question, req.user.id);
  }

  @Post(':id/chat/stream')
  @UseGuards(JwtAuthGuard)
  async chatWithAIStream(
    @Param('id') id: string,
    @Body('question') question: string,
    @Request() req: RequestWithUser,
    @Res() res: express.Response,
  ): Promise<void> {
    await this.meetingsService.findOneWithAccess(
      id,
      req.user.id,
      req.user.email,
    );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await this.aiChatService.chatWithAIStream(
      id,
      question,
      req.user.id,
    );

    const subscription = stream.subscribe({
      next: (chunk) => {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      },
      error: (err: unknown) => {
        const errorMsg = err instanceof Error ? err.message : String(err);
        res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
        res.end();
      },
      complete: () => {
        res.write('data: [DONE]\n\n');
        res.end();
      },
    });

    res.on('close', () => {
      subscription.unsubscribe();
    });
  }

  @Get(':id/chat/history')
  @UseGuards(JwtAuthGuard)
  async getAIChatHistory(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<any[]> {
    await this.meetingsService.findOneWithAccess(
      id,
      req.user.id,
      req.user.email,
    );
    return this.aiChatService.getAIChatHistory(id, req.user.id);
  }
}
