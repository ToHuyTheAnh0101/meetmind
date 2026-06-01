import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Observable } from 'rxjs';
import { Readable } from 'stream';
import {
  ANSWER_QUESTION_PROMPT,
  DEFAULT_SUMMARY_PROMPT,
  compileSummaryTemplatePrompt,
  PromptTemplateInput,
} from './prompts';
import { OllamaEmbeddingService } from './embedding.service';

type TranscriptionSegment = {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
};

/**
 * AI Service — 100% Ollama local (text generation + embedding).
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private configService: ConfigService,
    private embeddingService: OllamaEmbeddingService,
  ) {}

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
    const url = `${this.getOllamaUrl()}/api/generate`;
    const model = this.getOllamaModel();

    try {
      const response = await axios.post<{
        response: string;
        done: boolean;
        error?: string;
      }>(
        url,
        { model, prompt, stream: false, keep_alive: '5m' },
        { timeout: 120_000 },
      );

      if (response.data.error) {
        throw new Error(`Ollama error: ${response.data.error}`);
      }

      return response.data.response?.trim() || '';
    } catch (error) {
      this.logger.error(
        `Ollama text generation failed (${url}, model=${model}): ${error instanceof Error ? error.message : error}`,
      );
      throw new Error('Failed to generate AI response from Ollama');
    }
  }

  async answerQuestion(question: string, context: string): Promise<string> {
    try {
      const prompt = ANSWER_QUESTION_PROMPT(question, context);
      return await this.generateText(prompt);
    } catch (error) {
      this.logger.error('Error answering question:', error);
      throw new Error('Failed to answer question');
    }
  }

  async generateTextStream(prompt: string): Promise<Observable<string>> {
    const url = `${this.getOllamaUrl()}/api/generate`;
    const model = this.getOllamaModel();

    try {
      const response = await axios.post(
        url,
        { model, prompt, stream: true, keep_alive: '5m' },
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

  async answerQuestionStream(
    question: string,
    context: string,
  ): Promise<Observable<string>> {
    const prompt = ANSWER_QUESTION_PROMPT(question, context);
    return this.generateTextStream(prompt);
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
  ): Promise<string> {
    const whisperUrl = this.configService.get<string>('WHISPER_API_URL');

    if (!whisperUrl) {
      throw new Error(
        'WHISPER_API_URL is not configured. Audio transcription requires a local Whisper instance.',
      );
    }

    try {
      const formData = new globalThis.FormData();
      const arrayBufferView = new Uint8Array(audioBuffer);
      const fileBlob = new globalThis.Blob([arrayBufferView], {
        type: mimeType,
      });
      const whisperModel =
        this.configService.get<string>('WHISPER_MODEL') || 'large-v3';

      formData.append('file', fileBlob, 'audio.webm');
      formData.append('model', whisperModel);
      formData.append('language', 'vi');
      formData.append('temperature', '0.0');

      const response = await axios.post<{ text?: string }>(
        `${whisperUrl}/v1/audio/transcriptions`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      return response.data.text?.trim() || '';
    } catch (error) {
      this.logger.error('Error transcribing audio with Local Whisper:', error);
      throw new Error('Failed to transcribe audio with Local Whisper');
    }
  }

  async transcribeMultiTrackAudio(
    tracks: {
      buffer: Buffer;
      mimeType: string;
      speaker: string;
      startTime: number;
    }[],
  ): Promise<TranscriptionSegment[]> {
    const results: TranscriptionSegment[] = [];
    for (const track of tracks) {
      try {
        const text = await this.transcribeAudio(track.buffer, track.mimeType);
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
}
