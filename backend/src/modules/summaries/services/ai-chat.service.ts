import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Observable, Subscription } from 'rxjs';
import { ChatHistoryRepository } from '../repositories/chat-history.repository';
import { MeetingsService } from '../../meetings/services/meetings.service';
import { PollService } from '../../polls/services/poll.service';
import { QuestionService } from '../../qa/services/question.service';
import { AiService } from '../../../providers/ai/ai.service';
import { TranscriptRepository } from '../../meetings/repositories/transcript.repository';
import { MeetingRepository } from '../../meetings/repositories/meeting.repository';
import { ChatMessageType } from '../entities/chat-history.entity';

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    private readonly chatHistoryRepository: ChatHistoryRepository,
    private readonly meetingsService: MeetingsService,
    private readonly pollService: PollService,
    private readonly questionService: QuestionService,
    private readonly aiService: AiService,
    private readonly transcriptRepository: TranscriptRepository,
    private readonly meetingRepository: MeetingRepository,
  ) {}

  async chatWithAIStream(
    meetingId: string,
    question: string,
    _userId: string,
  ): Promise<Observable<string>> {
    this.logger.log(
      `User ${_userId} chatting with AI (Stream) in meeting ${meetingId}`,
    );
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    // 1. Tạo vector embedding cho câu hỏi
    const questionEmbedding = await this.aiService.embed(question);

    if (!questionEmbedding || questionEmbedding.length === 0) {
      throw new BadRequestException(
        'Failed to generate embedding for the question.',
      );
    }

    // 2. Tìm kiếm các đoạn transcript liên quan nhất theo embedding bằng pgvector trực tiếp ở DB
    const relevantChunks =
      await this.transcriptRepository.findRelevantByEmbedding(
        meetingId,
        questionEmbedding,
        8,
      );

    // 3. Xử lý ngữ cảnh (context)
    let contextText = '';
    if (relevantChunks.length > 0) {
      contextText = relevantChunks
        .map((chunk) => {
          const speakerLabel = chunk.speakerName
            ? `${chunk.speakerName}: `
            : '';
          return `${speakerLabel}${chunk.content}`;
        })
        .join('\n');
    } else {
      // Fallback thông minh: không tải toàn bộ transcript mà chỉ lấy 25 chunks gần nhất
      this.logger.warn(
        `No relevant chunks found above threshold for meeting ${meetingId} (stream). Using recent chunks fallback.`,
      );
      const recentChunks =
        await this.transcriptRepository.findRecentChunks(meetingId);
      contextText = recentChunks
        .map((c) =>
          c.speakerName ? `${c.speakerName}: ${c.content}` : c.content,
        )
        .join('\n');
    }

    if (!contextText || !contextText.trim()) {
      this.logger.warn('Empty context for Gemini chat stream fallback');
      contextText = 'No transcript context found.';
    }

    const getPolls = async (mid: string) => {
      const polls = await this.pollService.findByMeetingId(mid);
      return polls.map((p) => ({
        question: p.question,
        type: p.type,
        closedAt: p.closedAt,
        options:
          p.options?.map((o) => ({
            text: o.text,
            voteCount: o.voterIds?.length || 0,
          })) || [],
      }));
    };

    const getQa = async (mid: string) => {
      const qa = await this.questionService.findByMeetingId(mid);
      return qa.map((q) => ({
        question: q.content,
        askedBy: q.askedByUser
          ? `${q.askedByUser.firstName} ${q.askedByUser.lastName}`
          : 'Unknown',
        answers:
          q.answers?.map((a) => ({
            content: a.content,
            answeredBy: a.answeredByUser
              ? `${a.answeredByUser.firstName} ${a.answeredByUser.lastName}`
              : 'Unknown',
          })) || [],
      }));
    };

    return new Observable<string>((sub) => {
      let subscription: Subscription | undefined;

      this.aiService
        .answerQuestionStream(question, contextText, meetingId, {
          getPolls,
          getQa,
        })
        .then((streamObs) => {
          let fullAnswer = '';

          subscription = streamObs.subscribe({
            next: (chunk) => {
              fullAnswer += chunk;
              sub.next(chunk);
            },
            error: (err) => {
              sub.error(err);
            },
            complete: () => {
              void (async () => {
                // Tìm ảnh màn hình liên quan bằng hybrid retrieval
                const relevantCaptures =
                  await this.meetingsService.findRelevantCaptures(
                    meetingId,
                    relevantChunks,
                    questionEmbedding,
                  );

                const imageInfoList = relevantCaptures.map((cap) => ({
                  url: cap.imageUrl,
                  timestamp: cap.timestamp,
                }));

                let markdownAppendix = '';
                if (imageInfoList.length > 0) {
                  markdownAppendix =
                    '\n\n**Hình ảnh slide được nhắc đến:**\n' +
                    imageInfoList
                      .map(
                        (img) =>
                          `![Slide tại ${Math.round(img.timestamp)}s](${img.url})`,
                      )
                      .join('\n');
                }

                if (markdownAppendix) {
                  sub.next(markdownAppendix);
                  fullAnswer += markdownAppendix;
                }

                sub.complete();

                // Lưu lịch sử chat AI khi stream kết thúc
                try {
                  await this.chatHistoryRepository.save({
                    meetingId,
                    userId: _userId,
                    messageType: ChatMessageType.USER,
                    content: question,
                  });

                  await this.chatHistoryRepository.save({
                    meetingId,
                    userId: _userId,
                    messageType: ChatMessageType.AI,
                    content: fullAnswer,
                    metadata:
                      imageInfoList.length > 0
                        ? { images: imageInfoList }
                        : undefined,
                  });
                } catch (dbError) {
                  this.logger.error(
                    'Failed to save AI chat history in stream completion:',
                    dbError,
                  );
                }
              })();
            },
          });
        })
        .catch((err) => {
          sub.error(err);
        });

      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    });
  }

  async getAIChatHistory(meetingId: string, userId: string): Promise<any[]> {
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    return this.chatHistoryRepository.findHistory(meetingId, userId);
  }
}
