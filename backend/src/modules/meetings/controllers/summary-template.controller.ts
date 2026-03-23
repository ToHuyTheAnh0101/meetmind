import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Query,
} from '@nestjs/common';
import { SummaryTemplateService } from '../services/summary-template.service';
import { SummaryTemplate, SummaryTemplatePurpose } from '../entities';
import { CreateSummaryTemplateDto } from '../dto/create-summary-template.dto';
import { UpdateSummaryTemplateDto } from '../dto/update-summary-template.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('summary-templates')
export class SummaryTemplateController {
  constructor(private summaryTemplateService: SummaryTemplateService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Request() req,
    @Query('purpose') purpose?: SummaryTemplatePurpose,
  ): Promise<SummaryTemplate[]> {
    return this.summaryTemplateService.getAvailableTemplates(
      req.user.id,
      purpose,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string): Promise<SummaryTemplate> {
    return this.summaryTemplateService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Request() req,
    @Body() dto: CreateSummaryTemplateDto,
  ): Promise<SummaryTemplate> {
    return this.summaryTemplateService.create(dto, req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSummaryTemplateDto,
  ): Promise<SummaryTemplate> {
    return this.summaryTemplateService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.summaryTemplateService.remove(id);
  }
}
