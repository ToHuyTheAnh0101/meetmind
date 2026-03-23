import { MeetingPermission } from '../entities';

export class ParticipantSummaryDto {
  id: string;
  firstName: string;
  lastName: string;
  isOrganizer: boolean;
  permissions: MeetingPermission[];
}

export class JoinResponseDto {
  meetingId: string;
  token: string;
  liveKitUrl: string;
  participants: ParticipantSummaryDto[];
}
