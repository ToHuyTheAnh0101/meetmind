import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { QuestionType } from '../entities/collaboration/meeting-question.entity';

export class CreateQuestionDto {
  @IsString()
  content: string;

  @IsEnum(QuestionType)
  @IsOptional()
  type?: QuestionType;

  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;
}

export class CreateAnswerDto {
  @IsString()
  content: string;
}
