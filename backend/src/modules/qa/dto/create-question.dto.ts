import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  content?: string;

  @IsString()
  @IsOptional()
  breakoutRoomId?: string;

  @IsBoolean()
  @IsOptional()
  revealAnswers?: boolean;
}

export class UpdateQuestionDto {
  @IsBoolean()
  @IsOptional()
  revealAnswers?: boolean;
}

export class CreateAnswerDto {
  @IsString()
  content?: string;
}
