import { IsString, IsOptional } from 'class-validator';

export class JoinMeetingDto {
  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  displayName?: string;
}
