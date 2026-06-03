import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SummaryTemplatePurpose } from '../entities/summary-template.entity';

class TemplateSectionDefDto {
  @IsString()
  name?: string;

  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  blockType?: string;

  @IsOptional()
  @IsString()
  aiInstructions?: string;

  @IsOptional()
  @IsString()
  placeholders?: string;

  @IsNumber()
  order?: number;
}

export class UpdateSummaryTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(SummaryTemplatePurpose)
  purpose?: SummaryTemplatePurpose;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateSectionDefDto)
  sections?: TemplateSectionDefDto[];

  @IsOptional()
  @IsString()
  summaryStyle?: string;

  @IsOptional()
  @IsString()
  globalRules?: string;
}
