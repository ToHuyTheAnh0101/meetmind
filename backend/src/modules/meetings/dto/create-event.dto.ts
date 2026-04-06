import { IsEnum } from 'class-validator';
import { EventType } from '../entities';

export class CreateEventDto {
  @IsEnum(EventType)
  type: EventType;
}
