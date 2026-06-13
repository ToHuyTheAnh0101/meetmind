import { IsString } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  content?: string;
}

export class CreateAnswerDto {
  @IsString()
  content?: string;
}
