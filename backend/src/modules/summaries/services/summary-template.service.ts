import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  SummaryTemplate,
  SummaryTemplatePurpose,
} from '../entities/summary-template.entity';
import { SummaryTemplateRepository } from '../repositories/summary-template.repository';

@Injectable()
export class SummaryTemplateService {
  constructor(private summaryTemplateRepository: SummaryTemplateRepository) {}

  // Helper to recursively normalize strings in templates to NFC
  private normalizeNFC<T>(obj: T): T {
    if (typeof obj === 'string') {
      return obj.normalize('NFC') as unknown as T;
    }
    if (Array.isArray(obj)) {
      return obj.map((item: unknown) =>
        this.normalizeNFC(item),
      ) as unknown as T;
    }
    if (obj !== null && typeof obj === 'object') {
      const newObj: Record<string, unknown> = {};
      const record = obj as Record<string, unknown>;
      for (const key of Object.keys(record)) {
        newObj[key] = this.normalizeNFC(record[key]);
      }
      return newObj as unknown as T;
    }
    return obj;
  }

  async create(
    data: Partial<SummaryTemplate>,
    createdByUserId: string,
  ): Promise<SummaryTemplate> {
    if (data.isSystem) {
      throw new BadRequestException('Cannot create system templates');
    }

    // Automatically normalize Vietnamese accents to NFC
    const normalizedData = this.normalizeNFC(data);

    const template = this.summaryTemplateRepository.create({
      ...normalizedData,
      createdByUserId,
    });

    return this.summaryTemplateRepository.save(template);
  }

  async findById(id: string): Promise<SummaryTemplate> {
    const template = await this.summaryTemplateRepository.findById(id);
    if (!template) {
      throw new NotFoundException('Summary template not found');
    }
    return template;
  }

  async findByPurpose(
    purpose: SummaryTemplatePurpose,
  ): Promise<SummaryTemplate[]> {
    return this.summaryTemplateRepository.findByPurpose(purpose);
  }

  async findAllSystem(): Promise<SummaryTemplate[]> {
    return this.summaryTemplateRepository.findAllSystem();
  }

  async findByUserId(userId: string): Promise<SummaryTemplate[]> {
    return this.summaryTemplateRepository.findByUserId(userId);
  }

  async findByUserIdAndPurpose(
    userId: string,
    purpose: SummaryTemplatePurpose,
  ): Promise<SummaryTemplate[]> {
    return this.summaryTemplateRepository.findByUserIdAndPurpose(
      userId,
      purpose,
    );
  }

  async getAvailableTemplates(
    userId: string,
    purpose?: SummaryTemplatePurpose,
  ): Promise<SummaryTemplate[]> {
    if (purpose) {
      return this.summaryTemplateRepository.findByUserIdAndPurpose(
        userId,
        purpose,
      );
    }

    const systemTemplates =
      await this.summaryTemplateRepository.findAllSystem();
    const userTemplates =
      await this.summaryTemplateRepository.findByUserId(userId);

    return [...systemTemplates, ...userTemplates];
  }

  async update(
    id: string,
    data: Partial<SummaryTemplate>,
  ): Promise<SummaryTemplate> {
    const template = await this.findById(id);

    if (template.isSystem) {
      throw new BadRequestException('Cannot edit system templates');
    }

    if (data.isSystem !== undefined) {
      throw new BadRequestException('Cannot modify isSystem flag');
    }

    if (data.createdByUserId !== undefined) {
      throw new BadRequestException('Cannot modify createdByUserId');
    }

    // Automatically normalize Vietnamese accents to NFC
    const normalizedData = this.normalizeNFC(data);

    Object.assign(template, normalizedData);
    return this.summaryTemplateRepository.save(template);
  }

  async remove(id: string): Promise<void> {
    const template = await this.findById(id);

    if (template.isSystem) {
      throw new BadRequestException('Cannot delete system templates');
    }

    await this.summaryTemplateRepository.remove(template);
  }
}
