import { IsString, IsOptional } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  content?: string;

  @IsString()
  @IsOptional()
  breakoutRoomId?: string;
}

export class CreateAnswerDto {
  @IsString()
  content?: string;
}
