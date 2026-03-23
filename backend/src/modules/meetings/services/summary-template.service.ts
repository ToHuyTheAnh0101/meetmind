import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SummaryTemplate, SummaryTemplatePurpose } from '../entities';
import { SummaryTemplateRepository } from '../repositories/summary-template.repository';

@Injectable()
export class SummaryTemplateService {
  constructor(private summaryTemplateRepository: SummaryTemplateRepository) {}

  async create(
    data: Partial<SummaryTemplate>,
    createdByUserId: string,
  ): Promise<SummaryTemplate> {
    if (data.isSystem) {
      throw new BadRequestException('Cannot create system templates');
    }

    const template = this.summaryTemplateRepository.create({
      ...data,
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

    if (data.isSystem !== undefined) {
      throw new BadRequestException('Cannot modify isSystem flag');
    }

    if (data.createdByUserId !== undefined) {
      throw new BadRequestException('Cannot modify createdByUserId');
    }

    Object.assign(template, data);
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
