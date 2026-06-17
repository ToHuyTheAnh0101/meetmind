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
  CLEAN_TRANSCRIPT_PROMPT,
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

  private getOllamaUrl(): string {
    return (
      this.configService.get<string>('OLLAMA_API_URL') ||
      'http://localhost:11434'
    );
  }

  private getOllamaModel(): string {
    return this.configService.get<string>('OLLAMA_MODEL') || 'qwen2:7b';
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

    /*
    // Ollama / Groq fallback commented out for performance evaluation
    const apiKey =
      this.configService.get<string>('GROQ_API_KEY') ||
      this.configService.get<string>('WHISPER_API_KEY');
    const model =
      this.configService.get<string>('GROQ_CHAT_MODEL') ||
      this.configService.get<string>('GROQ_MODEL') ||
      'llama-3.1-8b-instant';

    if (apiKey && apiKey !== 'your_groq_api_key_here') {
      const url = 'https://api.groq.com/openai/v1/chat/completions';
      try {
        const response = await axios.post<{
          choices: Array<{
            message: {
              content: string;
            };
          }>;
        }>(
          url,
          {
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0,
            stream: false,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            timeout: 60_000,
          },
        );
        return response.data.choices?.[0]?.message?.content?.trim() || '';
      } catch (error) {
        this.logger.error(
          `Groq text generation failed: ${error instanceof Error ? error.message : error}`,
        );
        throw new Error('Failed to generate AI response from Groq');
      }
    } else {
      const url = `${this.getOllamaUrl()}/api/generate`;
      const ollamaModel = this.getOllamaModel();

      try {
        const response = await axios.post<{
          response: string;
          done: boolean;
          error?: string;
        }>(
          url,
          { model: ollamaModel, prompt, stream: false, keep_alive: '5m' },
          { timeout: 120_000 },
        );

        if (response.data.error) {
          throw new Error(`Ollama error: ${response.data.error}`);
        }

        return response.data.response?.trim() || '';
      } catch (error) {
        this.logger.error(
          `Ollama text generation failed (${url}, model=${ollamaModel}): ${error instanceof Error ? error.message : error}`,
        );
        throw new Error('Failed to generate AI response from Ollama');
      }
    }
    */
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

    /*
    // Ollama / Groq stream fallback commented out for performance evaluation
    const apiKey =
      this.configService.get<string>('GROQ_API_KEY') ||
      this.configService.get<string>('WHISPER_API_KEY');
    const model =
      this.configService.get<string>('GROQ_CHAT_MODEL') ||
      this.configService.get<string>('GROQ_MODEL') ||
      'llama-3.1-8b-instant';

    if (apiKey && apiKey !== 'your_groq_api_key_here') {
      const url = 'https://api.groq.com/openai/v1/chat/completions';
      try {
        const response = await axios.post(
          url,
          {
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0,
            stream: true,
          },
          {
            responseType: 'stream',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            timeout: 60_000,
          },
        );

        return new Observable<string>((subscriber) => {
          const stream = response.data as Readable;
          let buffer = '';

          stream.on('data', (chunk: Buffer) => {
            buffer += chunk.toString('utf8');
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.length === 0) continue;
              if (trimmed === 'data: [DONE]') {
                subscriber.complete();
                return;
              }
              if (trimmed.startsWith('data: ')) {
                try {
                  const jsonStr = trimmed.slice(6);
                  const parsed = JSON.parse(jsonStr) as {
                    choices?: Array<{
                      delta?: {
                        content?: string;
                      };
                    }>;
                  };
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    subscriber.next(content);
                  }
                } catch {
                  // ignore parse errors
                }
              }
            }
          });

          stream.on('end', () => {
            subscriber.complete();
          });

          stream.on('error', (err) => {
            subscriber.error(err);
          });

          return () => {
            stream.destroy();
          };
        });
      } catch (error) {
        this.logger.error(`Groq stream initialization failed: ${error}`);
        throw error;
      }
    } else {
      const url = `${this.getOllamaUrl()}/api/generate`;
      const ollamaModel = this.getOllamaModel();

      try {
        const response = await axios.post(
          url,
          { model: ollamaModel, prompt, stream: true, keep_alive: '5m' },
          { responseType: 'stream', timeout: 120_000 },
        );

        return new Observable<string>((subscriber) => {
          const stream = response.data as Readable;
          let buffer = '';

          stream.on('data', (chunk: Buffer) => {
            buffer += chunk.toString('utf8');
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim().length === 0) continue;
              try {
                const parsed = JSON.parse(line) as {
                  response?: string;
                  done?: boolean;
                  error?: string;
                };
                if (parsed.error) {
                  subscriber.error(new Error(parsed.error));
                  return;
                }
                if (parsed.response) {
                  subscriber.next(parsed.response);
                }
                if (parsed.done) {
                  subscriber.complete();
                }
              } catch {
                // ignore parse errors for partial lines
              }
            }
          });

          stream.on('end', () => {
            if (buffer.trim().length > 0) {
              try {
                const parsed = JSON.parse(buffer) as { response?: string };
                if (parsed.response) {
                  subscriber.next(parsed.response);
                }
              } catch {
                // ignore end of stream parsing errors
              }
            }
            subscriber.complete();
          });

          stream.on('error', (err) => {
            subscriber.error(err);
          });

          return () => {
            stream.destroy();
          };
        });
      } catch (error) {
        this.logger.error(`Ollama stream initialization failed: ${error}`);
        throw error;
      }
    }
    */
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
          properties: {
            meetingId: {
              type: SchemaType.STRING,
              description: 'UUID của cuộc họp.',
            },
          },
          required: ['meetingId'],
        } as unknown as import('@google/generative-ai').FunctionDeclarationSchema,
      },
      {
        name: 'get_meeting_qa',
        description:
          'Lấy danh sách các câu hỏi và câu trả lời trong mục Hỏi đáp (Q&A) của cuộc họp.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            meetingId: {
              type: SchemaType.STRING,
              description: 'UUID của cuộc họp.',
            },
          },
          required: ['meetingId'],
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
    const whisperUrl =
      this.configService.get<string>('GROQ_API_URL') ||
      this.configService.get<string>('WHISPER_API_URL');

    if (!whisperUrl) {
      throw new Error(
        'GROQ_API_URL is not configured. Audio transcription requires a Whisper instance.',
      );
    }

    try {
      const formData = new globalThis.FormData();
      const arrayBufferView = new Uint8Array(audioBuffer);
      const fileBlob = new globalThis.Blob([arrayBufferView], {
        type: mimeType,
      });
      const whisperModel =
        this.configService.get<string>('GROQ_WHISPER_MODEL') ||
        this.configService.get<string>('WHISPER_MODEL') ||
        'whisper-large-v3';

      let promptText =
        'Alo, dạ, ok, vâng, ảo giác, RAG, AI, hallucination, check code.';
      if (meetingTitle) {
        const cleanTitle = meetingTitle.replace(/[\\"]/g, '');
        promptText += ` Chúng ta thảo luận về chủ đề "${cleanTitle}".`;
      }
      if (meetingDescription) {
        const cleanDesc = meetingDescription
          .replace(/[\\"]/g, '')
          .slice(0, 100);
        promptText += ` Nội dung liên quan đến: ${cleanDesc}.`;
      } else if (!meetingTitle) {
        promptText +=
          ' Chúng ta thảo luận về tiến độ công việc, lập trình dự án, kiểm tra code và ý kiến đóng góp.';
      }

      formData.append('file', fileBlob, 'audio.webm');
      formData.append('model', whisperModel);
      formData.append('language', 'vi');
      formData.append('temperature', '0.0');
      formData.append('prompt', promptText);
      formData.append('response_format', 'verbose_json');

      const headers: Record<string, string> = {
        'Content-Type': 'multipart/form-data',
      };

      const whisperApiKey =
        this.configService.get<string>('GROQ_API_KEY') ||
        this.configService.get<string>('WHISPER_API_KEY');
      if (whisperApiKey && whisperApiKey !== 'your_groq_api_key_here') {
        headers['Authorization'] = `Bearer ${whisperApiKey}`;
      }

      interface WhisperVerboseResponse {
        text?: string;
        segments?: {
          no_speech_prob?: number;
        }[];
      }

      const response = await axios.post<WhisperVerboseResponse>(
        `${whisperUrl}/v1/audio/transcriptions`,
        formData,
        { headers },
      );
      const rawText = response.data.text?.trim() || '';

      if (response.data.segments && response.data.segments.length > 0) {
        const avgNoSpeech =
          response.data.segments.reduce(
            (acc, seg) => acc + (seg.no_speech_prob ?? 0),
            0,
          ) / response.data.segments.length;
        if (avgNoSpeech > 0.8) {
          this.logger.log(
            `[Whisper Silence Guard] Discarding transcription due to high no_speech_prob: ${avgNoSpeech.toFixed(2)}`,
          );
          return '';
        }
      }

      return this.cleanWhisperHallucinations(rawText, meetingTitle);
    } catch (error) {
      this.logger.error('Error transcribing audio:', error);
      throw new Error('Failed to transcribe audio');
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

  async cleanTranscriptChunk(
    text: string,
    meetingTitle: string,
    speakerName?: string,
  ): Promise<string> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY is not configured. Skipping transcript cleaning.',
      );
      return text;
    }

    const model =
      this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash-lite';
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    const prompt = CLEAN_TRANSCRIPT_PROMPT(text, meetingTitle, speakerName);

    try {
      const response = await axios.post<GeminiResponse>(
        url,
        {
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
          },
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        },
      );

      const cleanedText =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return cleanedText ? cleanedText.trim() : text;
    } catch (error) {
      this.logger.error(
        'Failed to clean transcript chunk using Gemini:',
        error,
      );
      return text;
    }
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

  private cleanWhisperHallucinations(
    text: string,
    meetingTitle?: string,
  ): string {
    if (!text) return '';

    // Common Whisper hallucinations in Vietnamese for silent segments
    const blacklistedPhrases = [
      /cảm ơn các bạn đã theo dõi/gi,
      /hẹn gặp lại các bạn trong các video tiếp theo/gi,
      /hẹn gặp lại các bạn trong những video tiếp theo/gi,
      /hẹn gặp lại các bạn/gi,
      /cảm ơn các bạn đã xem/gi,
      /cảm ơn các bạn/gi,
      /chào tạm biệt/gi,
      /hãy đăng ký kênh/gi,
      /ủng hộ kênh/gi,
      /chúc các bạn một ngày/gi,
      /nếu các bạn thấy video này/gi,
      /hãy subscribe/gi,
      /sub kênh/gi,
      /like và share/gi,
      /like và chia sẻ/gi,
      /xin chào và hẹn gặp lại/gi,
      /chào các bạn/gi,
      /hẹn gặp lại/gi,
      /cảm ơn bạn đã theo dõi/gi,
      /cảm ơn mọi người/gi,
    ];

    let cleaned = text;
    for (const pattern of blacklistedPhrases) {
      cleaned = cleaned.replace(pattern, '');
    }

    // Clean up trailing/leading spaces and punctuations
    cleaned = cleaned
      .replace(/^\s*[,.;?!:\-–—\s]+\s*/g, '')
      .replace(/\s*[,.;?!:\-–—\s]+\s*$/g, '')
      .trim();

    const lowerText = cleaned.toLowerCase();

    // Discard prompt echoes in case of silence
    if (
      lowerText === 'chúng ta thảo luận về chủ đề' ||
      lowerText === 'chúng ta thảo luận về' ||
      lowerText === 'alo dạ ok vâng' ||
      lowerText === 'tiến độ công việc' ||
      lowerText === 'lập trình dự án' ||
      lowerText === 'kiểm tra code' ||
      lowerText === 'ý kiến đóng góp'
    ) {
      return '';
    }

    if (meetingTitle) {
      const lowerTitle = meetingTitle.toLowerCase().trim();
      if (lowerText === lowerTitle) {
        return '';
      }
    }

    // If the cleaned text is just a common artifact word like 'cô', 'alo', 'dạ', 'vâng'
    // but the original text was excessively long (hallucination clutter), clean it completely
    if (
      lowerText === 'cô' ||
      lowerText === 'alo' ||
      lowerText === 'dạ' ||
      lowerText === 'vâng' ||
      lowerText === 'ạ'
    ) {
      if (text.length > 50) {
        return '';
      }
    }

    return cleaned;
  }
}
