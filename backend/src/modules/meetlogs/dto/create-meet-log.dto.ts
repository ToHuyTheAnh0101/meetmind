import { IsEnum } from 'class-validator';
import { LogType } from '../entities/meet-log.entity';

export class CreateMeetLogDto {
  @IsEnum(LogType)
  type?: LogType;
}
