import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SummaryTemplatePurpose } from '../entities';

class TemplateSectionDefDto {
  @IsString()
  name: string;

  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  order: number;
}

export class CreateSummaryTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(SummaryTemplatePurpose)
  purpose: SummaryTemplatePurpose;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateSectionDefDto)
  sections: TemplateSectionDefDto[];
}
