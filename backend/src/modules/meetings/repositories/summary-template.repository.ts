import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SummaryTemplate, SummaryTemplatePurpose } from '../entities';

@Injectable()
export class SummaryTemplateRepository {
  constructor(
    @InjectRepository(SummaryTemplate)
    private readonly repo: Repository<SummaryTemplate>,
  ) {}

  async findById(id: string): Promise<SummaryTemplate | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['createdByUser'],
    });
  }

  async findByPurpose(
    purpose: SummaryTemplatePurpose,
  ): Promise<SummaryTemplate[]> {
    return this.repo.find({
      where: { purpose },
      order: { createdAt: 'DESC' },
    });
  }

  async findAllSystem(): Promise<SummaryTemplate[]> {
    return this.repo.find({
      where: { isSystem: true },
      order: { name: 'ASC' },
    });
  }

  async findByUserId(userId: string): Promise<SummaryTemplate[]> {
    return this.repo.find({
      where: { createdByUserId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByUserIdAndPurpose(
    userId: string,
    purpose: SummaryTemplatePurpose,
  ): Promise<SummaryTemplate[]> {
    return this.repo.find({
      where: [
        { isSystem: true, purpose },
        { createdByUserId: userId, purpose },
      ],
      order: { createdAt: 'DESC' },
    });
  }

  create(data: Partial<SummaryTemplate>): SummaryTemplate {
    return this.repo.create(data);
  }

  async save(template: Partial<SummaryTemplate>): Promise<SummaryTemplate> {
    return this.repo.save(template);
  }

  async remove(template: SummaryTemplate): Promise<void> {
    await this.repo.remove(template);
  }
}
