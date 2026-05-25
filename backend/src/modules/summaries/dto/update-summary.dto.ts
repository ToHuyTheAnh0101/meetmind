import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class UpdateSummaryDto {
  @IsOptional()
  @IsString()
  summaryText?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyPoints?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actionItems?: string[];

  @IsOptional()
  @IsBoolean()
  isOverall?: boolean;
}
