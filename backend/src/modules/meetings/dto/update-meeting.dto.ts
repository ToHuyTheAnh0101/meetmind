import { IsString, MaxLength, IsDateString, IsOptional } from 'class-validator';

export class UpdateMeetingDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsDateString()
  @IsOptional()
  startTime?: string;
}
