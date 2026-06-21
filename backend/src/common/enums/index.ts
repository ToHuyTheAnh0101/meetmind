export enum LogType {
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  SCREEN_SHARE_START = 'screen_share_start',
  SCREEN_SHARE_END = 'screen_share_end',
  POLL_STARTED = 'poll_started',
  POLL_ENDED = 'poll_ended',
  QA_OPENED = 'qa_opened',
  QA_CLOSED = 'qa_closed',
  RECORDING_STARTED = 'recording_started',
  RECORDING_STOPPED = 'recording_stopped',
  PARTICIPANT_ADMITTED = 'participant_admitted',
  PERMISSIONS_CHANGED = 'permissions_changed',
  BREAKOUT_STARTED = 'breakout_started',
  BREAKOUT_ENDED = 'breakout_ended',
  AI_ASSISTANT_ACTIVATED = 'ai_assistant_activated',
  AI_ASSISTANT_DEACTIVATED = 'ai_assistant_deactivated',
  AI_SUMMARY_GENERATED = 'ai_summary_generated',
  MEETING_ENDED = 'meeting_ended',
}

export enum BreakoutRoomStatus {
  CREATED = 'created',
  ACTIVE = 'active',
  CLOSED = 'closed',
}

export enum SummaryTemplatePurpose {
  INTERVIEW = 'interview',
  REPORT = 'report',
  PROJECT_DISCUSSION = 'project_discussion',
  TEAM_MEETING = 'team_meeting',
  BRAINSTORMING = 'brainstorming',
  TRAINING = 'training',
  RETROSPECTIVE = 'retrospective',
  SALES_PITCH = 'sales_pitch',
  CUSTOM = 'custom',
}

export enum ChatMessageType {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system',
}

export enum MeetingPermission {
  EDIT_SUMMARY = 'edit_summary',
  CHAT_WITH_AI = 'chat_with_ai',
  UPDATE_PERMISSIONS = 'update_permissions',
  VIEW_TRANSCRIPT = 'view_transcript',
  DOWNLOAD_RECORDING = 'download_recording',
  EDIT_MEETING_INFO = 'edit_meeting_info',
  MANAGE_POLLS = 'manage_polls',
  MANAGE_QA = 'manage_qa',
  CO_HOST = 'co_host',
}

export enum ParticipantStatus {
  ADMITTED = 'admitted',
  WAITING = 'waiting',
  DENIED = 'denied',
}

export enum MeetingStatus {
  SCHEDULED = 'scheduled',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  PENDING_COMPLETION = 'pending_completion',
}

export enum MeetingAccessType {
  PUBLIC = 'public',
  INVITE_ONLY = 'invite_only',
}

export enum AttachmentType {
  DOCUMENT = 'document',
  AUDIO = 'audio',
  LINK = 'link',
  VIDEO = 'video',
  IMAGE = 'image',
  OTHER = 'other',
}

export enum PollType {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
}
