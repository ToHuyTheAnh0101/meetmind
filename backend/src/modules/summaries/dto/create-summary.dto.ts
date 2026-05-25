import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreateSummaryDto {
  @IsString()
  summaryText: string;

  @IsArray()
  @IsString({ each: true })
  keyPoints: string[];

  @IsArray()
  @IsString({ each: true })
  actionItems: string[];

  @IsOptional()
  @IsBoolean()
  isOverall?: boolean;

  @IsOptional()
  @IsString()
  agendaItemId?: string;
}
