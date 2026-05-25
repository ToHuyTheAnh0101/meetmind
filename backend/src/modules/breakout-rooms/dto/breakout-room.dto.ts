import {
  IsString,
  IsArray,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BreakoutRoomAssignmentDto {
  @IsUUID()
  userId: string;
}

export class CreateBreakoutRoomDto {
  @IsString()
  name: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BreakoutRoomAssignmentDto)
  assignments?: BreakoutRoomAssignmentDto[];
}

export class SetupBreakoutRoomsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBreakoutRoomDto)
  rooms: CreateBreakoutRoomDto[];

  @IsOptional()
  @Type(() => Number)
  durationMinutes?: number;
}
