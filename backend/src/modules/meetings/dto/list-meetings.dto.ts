import { IsOptional, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { MeetingStatus } from '../entities';

export class ListMeetingsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(MeetingStatus)
  status?: MeetingStatus;
}
