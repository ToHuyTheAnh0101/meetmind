export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  picture?: string | null;
  profilePictureUrl: string | null;
}

export interface AuthVerifyResponse {
  isAuthenticated: boolean;
  user: User;
}

export type MeetingStatus =
  | "scheduled"
  | "ongoing"
  | "completed"
  | "canceled"
  | "cancelled"
  | "pending_completion";
export type MeetingAccessType = "public" | "invite_only";

export enum ParticipantStatus {
  ADMITTED = "admitted",
  WAITING = "waiting",
  DENIED = "denied",
}

export enum MeetingPermission {
  EDIT_SUMMARY = "edit_summary",
  CHAT_WITH_AI = "chat_with_ai",
  UPDATE_PERMISSIONS = "update_permissions",
  VIEW_TRANSCRIPT = "view_transcript",
  DOWNLOAD_RECORDING = "download_recording",
  EDIT_MEETING_INFO = "edit_meeting_info",
  MANAGE_POLLS = "manage_polls",
  MANAGE_QA = "manage_qa",
  CO_HOST = "co_host",
}

export interface Meeting {
  id: string;
  title: string;
  description?: string | null;
  status: MeetingStatus;
  startTime: string;
  endTime?: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  createdAt?: string;
  updatedAt?: string;
  organizer?: User;
  participants?: Participant[];
  // Advanced configuration
  accessType?: MeetingAccessType;
  waitingRoomEnabled?: boolean;
  muteOnJoin?: boolean;
  allowDisplayNameEdit?: boolean;
  isQaEnabled?: boolean;
  inviteeEmails?: string[];
  reminderMinutes?: number;
  password?: string;
  organizerId?: string;
  templateId?: string | null;
  template?: SummaryTemplate | null;
  aiActivated?: boolean;
  aiRecordingState?: 'inactive' | 'recording' | 'processing';
  hasTranscripts?: boolean;
}

export interface Participant {
  id: string;
  meetingId: string;
  userId: string;
  isOrganizer: boolean;
  status: ParticipantStatus;
  user: User;
  permissions: MeetingPermission[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export enum SummaryTemplatePurpose {
  INTERVIEW = "interview",
  REPORT = "report",
  PROJECT_DISCUSSION = "project_discussion",
  TEAM_MEETING = "team_meeting",
  BRAINSTORMING = "brainstorming",
  TRAINING = "training",
  RETROSPECTIVE = "retrospective",
  SALES_PITCH = "sales_pitch",
  CUSTOM = "custom",
}

export interface TemplateSectionDef {
  name: string;
  label: string;
  description?: string;
  blockType?: string;
  aiInstructions?: string;
  placeholders?: string;
  order: number;
}

export interface SummaryTemplate {
  id: string;
  name: string;
  description?: string;
  purpose: SummaryTemplatePurpose;
  sections: TemplateSectionDef[];
  summaryStyle?: string;
  globalRules?: string;
  isSystem: boolean;
  createdByUserId?: string;
  createdAt?: string;
  updatedAt?: string;
}
