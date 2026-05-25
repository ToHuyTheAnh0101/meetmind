import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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

export class UpdateSummaryTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateSectionDefDto)
  sections?: TemplateSectionDefDto[];
}
