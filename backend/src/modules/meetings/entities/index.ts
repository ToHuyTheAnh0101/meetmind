// Core Entities
export {
  Meeting,
  MeetingStatus,
  MeetingAccessType,
} from './core/meeting.entity';
export {
  Participant,
  MeetingPermission,
  ParticipantStatus,
} from './core/participant.entity';

// Scheduling
export { Notification } from './scheduling/notification.entity';
export {
  AccessRequest,
  AccessRequestStatus,
} from './scheduling/access-request.entity';

// Real-time Collaboration
// Content & Analytics
export { TranscriptChunk } from './content/transcript-chunk.entity';
export { MeetingRecording } from './content/meeting-recording.entity';
export {
  MeetingSession,
  MeetingSessionStatus,
} from './core/meeting-session.entity';

// AI Features
export { ChatHistory, ChatMessageType } from './ai/chat-history.entity';
