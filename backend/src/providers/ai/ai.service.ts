import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

interface EmbeddingResponse {
  embedding?: {
    values?: number[];
  };
}

interface ParsedSummary {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
}

@Injectable()
export class AiService {
  private geminiApiKey: string;
  private geminiApiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new BadRequestException(
        'GEMINI_API_KEY environment variable is not set',
      );
    }
    this.geminiApiKey = apiKey;
  }

  /**
   * Summarize transcript content using Gemini API
   */
  async summarizeTranscript(
    transcript: string,
  ): Promise<{ summary: string; actionItems: string[]; keyPoints: string[] }> {
    try {
      const prompt = `
Please analyze the following meeting transcript and provide:
1. A concise summary (2-3 paragraphs)
2. Key points (bullet list)
3. Action items with owners if mentioned

Transcript:
${transcript}

Format your response as JSON with keys: summary, keyPoints (array), actionItems (array)
      `;

      const response = await axios.post<GeminiResponse>(
        `${this.geminiApiUrl}/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        },
      );

      const responseText =
        response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = JSON.parse(responseText) as ParsedSummary;

      return {
        summary: parsed.summary,
        keyPoints: parsed.keyPoints || [],
        actionItems: parsed.actionItems || [],
      };
    } catch (error) {
      console.error('Error summarizing transcript:', error);
      throw new Error('Failed to summarize transcript');
    }
  }

  /**
   * Generate embeddings for transcript chunks using Gemini API
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await axios.post<EmbeddingResponse>(
        `${this.geminiApiUrl}/embedding-001:embedContent?key=${this.geminiApiKey}`,
        {
          model: 'models/embedding-001',
          content: {
            parts: [
              {
                text: text,
              },
            ],
          },
        },
      );

      return response.data.embedding?.values || [];
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Answer question based on RAG retrieval
   */
  async answerQuestion(question: string, context: string): Promise<string> {
    try {
      const prompt = `
Based on the following meeting context, answer the question as accurately as possible.
If the answer is not in the context, say you don't have enough information.

Meeting Context:
${context}

Question: ${question}

Provide a clear and concise answer.
      `;

      const response = await axios.post<GeminiResponse>(
        `${this.geminiApiUrl}/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        },
      );

      return response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error) {
      console.error('Error answering question:', error);
      throw new Error('Failed to answer question');
    }
  }
}
