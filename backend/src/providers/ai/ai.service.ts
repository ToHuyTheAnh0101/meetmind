import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  Part,
} from '@google/generative-ai';

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Sử dụng gemini-2.0-flash cho tốc độ và khả năng xử lý audio tốt nhất
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  /**
   * Trả lời câu hỏi dựa trên ngữ cảnh cuộc họp
   */
  async answerQuestion(question: string, context: string): Promise<string> {
    try {
      const prompt = `
        Bạn là một trợ lý cuộc họp thông minh. Dựa trên nội dung cuộc họp sau đây:
        
        ${context}
        
        Hãy trả lời câu hỏi: ${question}
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error answering question:', error);
      throw new Error('Failed to answer question');
    }
  }

  /**
   * Chuyển đổi âm thanh đơn lẻ sang văn bản
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    try {
      const audioPart: Part = {
        inlineData: {
          data: audioBuffer.toString('base64'),
          mimeType: mimeType,
        },
      };

      const result = await this.model.generateContent([
        audioPart,
        'Hãy dịch đoạn âm thanh này sang tiếng Việt một cách chính xác. Trả về văn bản thuần túy.',
      ]);

      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error transcribing audio:', error);
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
  ): Promise<any[]> {
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

      const result = await this.model.generateContent(parts);
      const response = await result.response;
      const responseText = response.text();

      // Trích xuất JSON từ phản hồi của AI
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      const cleanJson = jsonMatch ? jsonMatch[0] : responseText;

      return JSON.parse(cleanJson);
    } catch (error) {
      console.error('Error in multi-track transcription:', error);
      // Trả về mảng rỗng nếu có lỗi để tránh crash hệ thống
      return [];
    }
  }
}
