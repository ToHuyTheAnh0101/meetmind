import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  Part,
  GenerateContentResult,
} from '@google/generative-ai';
import axios from 'axios';
import {
  ANSWER_QUESTION_PROMPT,
  DEFAULT_SUMMARY_PROMPT,
  compileSummaryTemplatePrompt,
  PromptTemplateInput,
} from './prompts';

type TranscriptionSegment = {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
};

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI;
  private primaryModel: GenerativeModel;
  private fallbackModel: GenerativeModel;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);

    const mainModelName =
      this.configService.get<string>('GEMINI_MODEL') || 'gemini-1.5-flash';
    const fallbackModelName =
      mainModelName === 'gemini-1.5-flash'
        ? 'gemini-2.0-flash'
        : 'gemini-1.5-flash';

    this.primaryModel = this.genAI.getGenerativeModel({ model: mainModelName });
    this.fallbackModel = this.genAI.getGenerativeModel({
      model: fallbackModelName,
    });
  }

  /**
   * Helper to execute Gemini generation with automatic fallback on quota/rate limit errors (429),
   * and supporting local self-hosted Ollama LLM container when OLLAMA_API_URL is configured.
   */
  private async generateContentWithFallback(
    prompt: string | (string | Part)[],
  ): Promise<GenerateContentResult> {
    const ollamaUrl = this.configService.get<string>('OLLAMA_API_URL');
    const ollamaModel =
      this.configService.get<string>('OLLAMA_MODEL') || 'qwen2:7b';

    // 1. If Ollama URL is configured, use local self-hosted Docker container first (free & offline)
    if (ollamaUrl) {
      try {
        let textPrompt = '';
        if (typeof prompt === 'string') {
          textPrompt = prompt;
        } else if (Array.isArray(prompt)) {
          textPrompt = prompt
            .map((p) => {
              if (typeof p === 'string') return p;
              if (p && 'text' in p) return p.text;
              return '';
            })
            .join('\n');
        }

        const response = await axios.post<{ response: string }>(
          `${ollamaUrl}/api/generate`,
          {
            model: ollamaModel,
            prompt: textPrompt,
            stream: false,
          },
        );

        // Mock the Gemini response signature to provide 100% backward compatibility
        return {
          response: {
            text: () => response.data.response || '',
          },
        } as unknown as GenerateContentResult;
      } catch (error) {
        console.error(
          `[AiService] Local Ollama failed, falling back to Gemini Cloud:`,
          error,
        );
      }
    }

    // 2. Gemini Cloud Model Fallback Chain (1.5-flash -> 2.0-flash)
    try {
      return await this.primaryModel.generateContent(prompt);
    } catch (err: unknown) {
      const error = err as Record<string, any>;
      const isQuotaError =
        error?.status === 429 ||
        (typeof error?.message === 'string' &&
          (error.message.includes('429') ||
            error.message.toLowerCase().includes('quota') ||
            error.message.toLowerCase().includes('limit')));

      if (isQuotaError) {
        console.warn(
          `[AiService] Primary model failed due to rate limit/quota. Retrying with fallback model...`,
        );
        try {
          return await this.fallbackModel.generateContent(prompt);
        } catch (fallbackError) {
          console.error(
            `[AiService] Fallback model also failed:`,
            fallbackError,
          );
          throw fallbackError;
        }
      }
      throw err;
    }
  }

  /**
   * Trả lời câu hỏi dựa trên ngữ cảnh cuộc họp
   */
  async answerQuestion(question: string, context: string): Promise<string> {
    try {
      const prompt = ANSWER_QUESTION_PROMPT(question, context);
      const result = await this.generateContentWithFallback(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Error answering question:', error);
      throw new Error('Failed to answer question');
    }
  }

  /**
   * Tạo bản tóm tắt cuộc họp thông minh dựa trên transcript
   */
  async generateSummary(title: string, transcript: string): Promise<string> {
    try {
      const prompt = DEFAULT_SUMMARY_PROMPT(title, transcript);
      const result = await this.generateContentWithFallback(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error('Failed to generate summary');
    }
  }

  /**
   * Tạo bản tóm tắt cuộc họp dựa trên mẫu tóm tắt (Template) cấu trúc
   */
  async generateSummaryWithTemplate(
    title: string,
    transcript: string,
    template: PromptTemplateInput,
  ): Promise<string> {
    try {
      const prompt = compileSummaryTemplatePrompt(title, transcript, template);
      const result = await this.generateContentWithFallback(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating summary with template:', error);
      throw new Error('Failed to generate summary with template');
    }
  }

  /**
   * Chuyển đổi âm thanh đơn lẻ sang văn bản
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const whisperUrl = this.configService.get<string>('WHISPER_API_URL');

    // NẾU CÓ CẤU HÌNH WHISPER_API_URL -> DÙNG LOCAL WHISPER MIỄN PHÍ
    if (whisperUrl) {
      try {
        const formData = new globalThis.FormData();
        const arrayBufferView = new Uint8Array(audioBuffer);
        const fileBlob = new globalThis.Blob([arrayBufferView], {
          type: mimeType,
        });
        formData.append('file', fileBlob, 'audio.webm');
        formData.append('model', 'large-v3'); // Model mạnh nhất thế giới hỗ trợ tiếng Việt đỉnh cao tuyệt đối
        formData.append('language', 'vi');
        formData.append('temperature', '0.0'); // Ép AI dịch chính xác, không tự bịa/lặp từ khi im lặng

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
        console.error('Error transcribing audio with Local Whisper:', error);
        throw new Error('Failed to transcribe audio with Local Whisper');
      }
    }

    // NẾU KHÔNG CÓ CẤU HÌNH -> FALLBACK SỬ DỤNG GEMINI NHƯ CŨ
    try {
      const audioPart: Part = {
        inlineData: {
          data: audioBuffer.toString('base64'),
          mimeType: mimeType,
        },
      };

      const result = await this.generateContentWithFallback([
        audioPart,
        'Hãy dịch đoạn âm thanh này sang tiếng Việt một cách chính xác. Trả về văn bản thuần túy.',
      ]);

      const response = result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error transcribing audio with Gemini:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  /**
   * Xử lý đa luồng âm thanh (Multi-track) để giữ ngữ cảnh cuộc họp
   */
  async transcribeMultiTrackAudio(
    tracks: {
      buffer: Buffer;
      mimeType: string;
      speaker: string;
      startTime: number;
    }[],
  ): Promise<TranscriptionSegment[]> {
    try {
      const parts: Part[] = [];

      // Thêm từng đoạn âm thanh kèm thông tin người nói
      tracks.forEach((track, index) => {
        parts.push({
          inlineData: {
            data: track.buffer.toString('base64'),
            mimeType: track.mimeType,
          },
        });
        parts.push({
          text: `Đoạn âm thanh ${index + 1}: Người nói ${track.speaker}, bắt đầu lúc ${track.startTime} giây.`,
        });
      });

      // Thêm chỉ dẫn cuối cùng
      parts.push({
        text: `
          Bạn là một chuyên gia ghi chép cuộc họp. Hãy nghe tất cả các đoạn âm thanh trên và thực hiện:
          1. Chuyển đổi toàn bộ sang văn bản tiếng Việt.
          2. Sử dụng ngữ cảnh của các đoạn trước để dịch chính xác các đoạn sau (đặc biệt là các từ chuyên môn hoặc tên riêng).
          3. Phân biệt rõ ai đang nói dựa trên thông tin tôi đã cung cấp.
          
          Trả về kết quả dưới dạng một mảng JSON duy nhất, mỗi phần tử có cấu trúc:
          {
            "speaker": "Tên người nói",
            "text": "Nội dung văn bản",
            "startTime": số giây,
            "endTime": số giây
          }
          
          Chỉ trả về JSON, không giải thích gì thêm.
        `,
      });

      const result = await this.generateContentWithFallback(parts);
      const response = result.response;
      const responseText = response.text();

      // Trích xuất JSON từ phản hồi của AI
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      const cleanJson = jsonMatch ? jsonMatch[0] : responseText;

      const parsed = JSON.parse(cleanJson) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter(
          (item): item is Record<string, unknown> =>
            typeof item === 'object' && item !== null,
        )
        .map((item) => ({
          speaker: typeof item.speaker === 'string' ? item.speaker : 'Unknown',
          text: typeof item.text === 'string' ? item.text : '',
          startTime:
            typeof item.startTime === 'number'
              ? item.startTime
              : Number(item.startTime) || 0,
          endTime:
            typeof item.endTime === 'number'
              ? item.endTime
              : Number(item.endTime) || 0,
        }));
    } catch (error) {
      console.error('Error in multi-track transcription:', error);
      // Trả về mảng rỗng nếu có lỗi để tránh crash hệ thống
      return [];
    }
  }
}
