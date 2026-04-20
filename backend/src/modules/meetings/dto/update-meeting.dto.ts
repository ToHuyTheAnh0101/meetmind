import {
  IsString,
  MaxLength,
  IsDateString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsEmail,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { MeetingAccessType } from '../entities/core/meeting.entity';

export class UpdateMeetingDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsEnum(MeetingAccessType)
  @IsOptional()
  accessType?: MeetingAccessType;

  @IsBoolean()
  @IsOptional()
  waitingRoomEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  muteOnJoin?: boolean;

  @IsArray()
  @IsEmail({}, { each: true })
  @IsOptional()
  inviteeEmails?: string[];

  @IsNumber()
  @Min(0)
  @Max(1440)
  @IsOptional()
  reminderMinutes?: number;
}
