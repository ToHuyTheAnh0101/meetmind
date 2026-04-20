import { MeetingPermission, ParticipantStatus } from '../entities';

export class ParticipantSummaryDto {
  id: string;
  firstName: string;
  lastName: string;
  isOrganizer: boolean;
  permissions: MeetingPermission[];
  status: ParticipantStatus;
}

export class JoinResponseDto {
  meetingId: string;
  organizerId: string;
  status: ParticipantStatus;
  token: string;
  liveKitUrl: string;
  participants: ParticipantSummaryDto[];
}
