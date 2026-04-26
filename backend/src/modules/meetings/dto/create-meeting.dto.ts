import {
  IsString,
  IsNotEmpty,
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

export class CreateMeetingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsDateString()
  startTime: string;

  @IsEnum(MeetingAccessType)
  @IsOptional()
  accessType?: MeetingAccessType;

  @IsBoolean()
  @IsOptional()
  waitingRoomEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  muteOnJoin?: boolean;

  @IsBoolean()
  @IsOptional()
  allowDisplayNameEdit?: boolean;

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
