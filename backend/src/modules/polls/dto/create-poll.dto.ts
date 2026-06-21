import {
  IsString,
  IsArray,
  ValidateNested,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

import { PollType } from '../../../common/enums';

class PollOptionDto {
  @IsString()
  id?: string;

  @IsString()
  text?: string;
}

export class CreatePollDto {
  @IsString()
  question?: string;

  @IsEnum(PollType)
  @IsOptional()
  type?: PollType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PollOptionDto)
  options?: PollOptionDto[];

  @IsString()
  @IsOptional()
  breakoutRoomId?: string;
}
