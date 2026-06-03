import { IsEnum } from 'class-validator';
import { EventType } from '../entities/meeting-event.entity';

export class CreateEventDto {
  @IsEnum(EventType)
  type?: EventType;
}
