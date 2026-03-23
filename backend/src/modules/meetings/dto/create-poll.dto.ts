import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PollOptionDto {
  @IsString()
  id: string;

  @IsString()
  text: string;
}

export class CreatePollDto {
  @IsString()
  question: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PollOptionDto)
  options: PollOptionDto[];
}
