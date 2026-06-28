import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Observable } from 'rxjs';
import { GoogleGenerativeAI, SchemaType, Part } from '@google/generative-ai';
import {
  ANSWER_QUESTION_PROMPT,
  DEFAULT_SUMMARY_PROMPT,
  compileSummaryTemplatePrompt,
  PromptTemplateInput,
  ANALYZE_IMAGE_PROMPT,
} from './prompts';
import { EmbeddingService } from './embedding.service';

type TranscriptionSegment = {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
};

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

/**
 * AI Service — Unified LLM and Embedding service interface.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(
    private configService: ConfigService,
    private embeddingService: EmbeddingService,
  ) {
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (geminiKey) {
      this.genAI = new GoogleGenerativeAI(geminiKey);
    } else {
      this.logger.warn(
        'GEMINI_API_KEY is not configured. Text generation might fail.',
      );
    }
  }

  private async generateText(prompt: string): Promise<string> {
    if (!this.genAI) {
      throw new Error(
        'Google Generative AI (Gemini) is not initialized. Check GEMINI_API_KEY.',
      );
    }

    const modelName =
      this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash-lite';

    try {
      const model = this.genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text()?.trim() || '';
    } catch (error) {
      this.logger.error(
        `Gemini text generation failed: ${error instanceof Error ? error.message : error}`,
      );
      throw new Error('Failed to generate AI response from Gemini');
    }
  }

  async answerQuestion(
    question: string,
    context: string,
    meetingId?: string,
    handlers?: {
      getPolls: (meetingId: string) => Promise<any>;
      getQa: (meetingId: string) => Promise<any>;
    },
  ): Promise<string> {
    try {
      const prompt = ANSWER_QUESTION_PROMPT(question, context);

      if (!this.genAI) {
        throw new Error(
          'Google Generative AI (Gemini) is not initialized. Check GEMINI_API_KEY.',
        );
      }

      const modelName =
        this.configService.get<string>('GEMINI_MODEL') ||
        'gemini-2.5-flash-lite';

      const toolDeclarations = this.getToolDeclarations();

      const model = this.genAI.getGenerativeModel({
        model: modelName,
        tools:
          meetingId && handlers
            ? [{ functionDeclarations: toolDeclarations }]
            : undefined,
      });

      if (meetingId && handlers) {
        const chat = model.startChat();
        const result = await chat.sendMessage(prompt);
        const responseTyped = result.response as unknown as {
          functionCalls():
            | Array<{ name: string; args: Record<string, unknown> }>
            | undefined;
        };
        const functionCalls = responseTyped.functionCalls();
        if (functionCalls && functionCalls.length > 0) {
          const responses: Part[] = [];
          for (const call of functionCalls) {
            const functionResult = await this.executeToolCall(
              call.name,
              meetingId,
              handlers,
            );
            responses.push({
              functionResponse: {
                name: call.name,
                response: { result: functionResult },
              },
            });
          }
          const finalResult = await chat.sendMessage(responses);
          return finalResult.response.text()?.trim() || '';
        }
        return result.response.text()?.trim() || '';
      } else {
        const result = await model.generateContent(prompt);
        return result.response.text()?.trim() || '';
      }
    } catch (error) {
      this.logger.error('Error answering question:', error);
      throw new Error('Failed to answer question');
    }
  }

  async generateTextStream(prompt: string): Promise<Observable<string>> {
    await Promise.resolve();
    if (!this.genAI) {
      throw new Error(
        'Google Generative AI (Gemini) is not initialized. Check GEMINI_API_KEY.',
      );
    }

    const modelName =
      this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash-lite';

    return new Observable<string>((subscriber) => {
      let isCancelled = false;

      void (async () => {
        try {
          const model = this.genAI!.getGenerativeModel({ model: modelName });
          const resultStream = await model.generateContentStream(prompt);
          for await (const chunk of resultStream.stream) {
            if (isCancelled) break;
            const text = chunk.text();
            if (text) {
              subscriber.next(text);
            }
          }
          if (!isCancelled) {
            subscriber.complete();
          }
        } catch (err) {
          if (!isCancelled) {
            subscriber.error(err);
          }
        }
      })();

      return () => {
        isCancelled = true;
      };
    });
  }

  async answerQuestionStream(
    question: string,
    context: string,
    meetingId?: string,
    handlers?: {
      getPolls: (meetingId: string) => Promise<any>;
      getQa: (meetingId: string) => Promise<any>;
    },
  ): Promise<Observable<string>> {
    const prompt = ANSWER_QUESTION_PROMPT(question, context);

    if (!meetingId || !handlers) {
      return this.generateTextStream(prompt);
    }

    return new Observable<string>((subscriber) => {
      let isCancelled = false;

      void (async () => {
        try {
          if (!this.genAI) {
            throw new Error(
              'Google Generative AI (Gemini) is not initialized. Check GEMINI_API_KEY.',
            );
          }

          const modelName =
            this.configService.get<string>('GEMINI_MODEL') ||
            'gemini-2.5-flash-lite';

          const toolDeclarations = this.getToolDeclarations();

          const model = this.genAI.getGenerativeModel({
            model: modelName,
            tools: [{ functionDeclarations: toolDeclarations }],
          });

          const chat = model.startChat();

          const resultStream = await chat.sendMessageStream(prompt);

          const functionCalls: Array<{
            name: string;
            args: Record<string, unknown>;
          }> = [];

          for await (const chunk of resultStream.stream) {
            if (isCancelled) break;

            const chunkTyped = chunk as unknown as {
              functionCalls():
                | Array<{ name: string; args: Record<string, unknown> }>
                | undefined;
              candidates?: Array<{
                content?: {
                  parts?: Array<{
                    functionCall?: {
                      name: string;
                      args: Record<string, unknown>;
                    };
                  }>;
                };
              }>;
            };

            const calls =
              typeof chunkTyped.functionCalls === 'function'
                ? chunkTyped.functionCalls()
                : undefined;

            const legacyCall =
              chunkTyped.candidates?.[0]?.content?.parts?.[0]?.functionCall;

            if (calls && calls.length > 0) {
              functionCalls.push(...calls);
            } else if (legacyCall) {
              functionCalls.push(legacyCall);
            } else {
              const text = chunk.text();
              if (text) {
                subscriber.next(text);
              }
            }
          }

          if (isCancelled) return;

          if (functionCalls.length > 0) {
            const responses: Part[] = [];
            for (const call of functionCalls) {
              const functionResult = await this.executeToolCall(
                call.name,
                meetingId,
                handlers,
              );
              responses.push({
                functionResponse: {
                  name: call.name,
                  response: { result: functionResult },
                },
              });
            }

            if (isCancelled) return;

            const finalStream = await chat.sendMessageStream(responses);

            for await (const chunk of finalStream.stream) {
              if (isCancelled) break;
              const text = chunk.text();
              if (text) {
                subscriber.next(text);
              }
            }
          }

          if (!isCancelled) {
            subscriber.complete();
          }
        } catch (err) {
          if (!isCancelled) {
            subscriber.error(err);
          }
        }
      })();

      return () => {
        isCancelled = true;
      };
    });
  }

  private getToolDeclarations(): import('@google/generative-ai').FunctionDeclaration[] {
    return [
      {
        name: 'get_meeting_polls',
        description:
          'Lấy danh sách các cuộc biểu quyết (polls) trong cuộc họp bao gồm các câu hỏi, các lựa chọn trả lời và số lượt bình chọn cho mỗi lựa chọn.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
          required: [],
        } as unknown as import('@google/generative-ai').FunctionDeclarationSchema,
      },
      {
        name: 'get_meeting_qa',
        description:
          'Lấy danh sách các câu hỏi và câu trả lời trong mục Hỏi đáp (Q&A) của cuộc họp.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
          required: [],
        } as unknown as import('@google/generative-ai').FunctionDeclarationSchema,
      },
    ];
  }

  private async executeToolCall(
    callName: string,
    meetingId: string,
    handlers?: {
      getPolls: (meetingId: string) => Promise<any>;
      getQa: (meetingId: string) => Promise<any>;
    },
  ): Promise<unknown> {
    if (!handlers) return null;
    if (callName === 'get_meeting_polls') {
      return handlers.getPolls(meetingId);
    } else if (callName === 'get_meeting_qa') {
      return handlers.getQa(meetingId);
    }
    return null;
  }

  async generateSummary(title: string, transcript: string): Promise<string> {
    try {
      const prompt = DEFAULT_SUMMARY_PROMPT(title, transcript);
      return await this.generateText(prompt);
    } catch (error) {
      this.logger.error('Error generating summary:', error);
      throw new Error('Failed to generate summary');
    }
  }

  async generateSummaryWithTemplate(
    title: string,
    transcript: string,
    template: PromptTemplateInput,
  ): Promise<string> {
    try {
      const prompt = compileSummaryTemplatePrompt(title, transcript, template);
      return await this.generateText(prompt);
    } catch (error) {
      this.logger.error('Error generating summary with template:', error);
      throw new Error('Failed to generate summary with template');
    }
  }

  async embed(text: string): Promise<number[]> {
    return this.embeddingService.embed(text);
  }

  async embedBatch(texts: string[], concurrency = 4): Promise<number[][]> {
    return this.embeddingService.embedBatch(texts, concurrency);
  }

  async transcribeAudio(
    audioBuffer: Buffer,
    mimeType: string,
    meetingTitle?: string,
    meetingDescription?: string,
  ): Promise<string> {
    this.logger.log(
      '[STT] Transcribing audio chunk using Google Gemini API...',
    );
    return this.transcribeAudioWithGemini(
      audioBuffer,
      mimeType,
      meetingTitle,
      meetingDescription,
    );
  }

  private async transcribeAudioWithGemini(
    audioBuffer: Buffer,
    mimeType: string,
    meetingTitle?: string,
    meetingDescription?: string,
  ): Promise<string> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured for Speech-to-Text.');
    }

    const model =
      this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

    const base64Audio = audioBuffer.toString('base64');

    let promptText = `
Bạn là trợ lý chép lời thoại cuộc họp tiếng Việt chuyên nghiệp và trung thực. 
Hãy lắng nghe đoạn âm thanh được cung cấp dưới đây và chép lại nguyên văn, chính xác tất cả những gì được nói.
Lưu ý quan trọng:
- Trả về phần văn bản chép thoại bằng tiếng Việt trực tiếp, TUYỆT ĐỐI không có thêm câu dẫn dắt, giải thích, mở đầu hay kết thúc (Ví dụ: không nói "Dưới đây là...", không nói "Đoạn âm thanh chứa...").
- Giữ nguyên các thuật ngữ tiếng Anh gốc thường dùng (Ví dụ: share, check, code, RAG, API, deploy, database).
- Nếu đoạn âm thanh chỉ chứa khoảng lặng, tiếng thở, tiếng ồn hoặc âm thanh không có giọng nói con người rõ ràng, hãy trả về một chuỗi rỗng hoàn toàn (không ghi gì cả). 
- TUYỆT ĐỐI KHÔNG tự ý ảo giác hóa hoặc chế ra các câu kêu gọi dạng đăng ký kênh mạng xã hội (như "Cảm ơn các bạn đã theo dõi", "Hãy subscribe kênh", "Các bạn có thể nhớ đăng ký kênh").
`.trim();

    if (meetingTitle) {
      promptText += `\n- Bối cảnh cuộc họp: Cuộc họp thảo luận về chủ đề "${meetingTitle.replace(/[\\"]/g, '')}".`;
    }
    if (meetingDescription) {
      promptText += `\n- Mô tả bối cảnh cuộc họp: ${meetingDescription.replace(/[\\"]/g, '').slice(0, 100)}.`;
    }

    try {
      const response = await axios.post<GeminiResponse>(
        url,
        {
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Audio,
                  },
                },
                {
                  text: promptText,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.0,
          },
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 25000,
        },
      );

      const transcript =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return transcript ? transcript.trim() : '';
    } catch (error) {
      this.logger.error('Failed to transcribe audio with Gemini:', error);
      throw new Error('Failed to transcribe audio using Gemini');
    }
  }

  async transcribeMultiTrackAudio(
    tracks: {
      buffer: Buffer;
      mimeType: string;
      speaker: string;
      startTime: number;
    }[],
    meetingTitle?: string,
    meetingDescription?: string,
  ): Promise<TranscriptionSegment[]> {
    const results: TranscriptionSegment[] = [];
    for (const track of tracks) {
      try {
        const text = await this.transcribeAudio(
          track.buffer,
          track.mimeType,
          meetingTitle,
          meetingDescription,
        );
        if (text && text.trim()) {
          results.push({
            speaker: track.speaker,
            text: text.trim(),
            startTime: track.startTime,
            endTime: track.startTime + 5, // Ước lượng tạm thời thời gian kết thúc
          });
        }
      } catch (err) {
        this.logger.error(
          `Failed to transcribe track for speaker ${track.speaker}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    return results.sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * Phân tích hình ảnh màn hình chia sẻ bằng Gemini Vision (multimodal).
   * Trả về chuỗi summary mô tả nội dung màn hình,
   * hoặc null nếu Gemini xác định đây là ảnh rác (desktop trống, camera, v.v.)
   *
   * @param imageBuffer - Buffer của file ảnh (JPEG/PNG)
   * @param mimeType - MIME type của ảnh ('image/jpeg' hoặc 'image/png')
   * @returns summary string nếu ảnh có giá trị thông tin, null nếu là ảnh rác
   */
  async analyzeImage(
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<string | null> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY is not configured. Skipping image analysis.',
      );
      return null;
    }

    const base64Image = imageBuffer.toString('base64');
    const model =
      this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash-lite';
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await axios.post<GeminiResponse>(
        url,
        {
          contents: [
            {
              parts: [
                { text: ANALYZE_IMAGE_PROMPT },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 256,
          },
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 20000,
        },
      );

      const rawText =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!rawText || rawText.toLowerCase() === 'null') {
        return null;
      }

      return rawText;
    } catch (error) {
      this.logger.error('Failed to analyze image using Gemini Vision:', error);
      // Fallback an toàn: coi như ảnh có giá trị để không mất dữ liệu
      return null;
    }
  }
}
