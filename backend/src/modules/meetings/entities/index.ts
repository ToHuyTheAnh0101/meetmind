// Core Entities
export { Meeting, MeetingStatus } from './core/meeting.entity';
export { Participant, MeetingPermission } from './core/participant.entity';

// Scheduling
export { Notification } from './scheduling/notification.entity';
export {
  AccessRequest,
  AccessRequestStatus,
} from './scheduling/access-request.entity';

// Real-time Collaboration
export { MeetingEvent, EventType } from './collaboration/meeting-event.entity';
export { MeetingQuestion } from './collaboration/meeting-question.entity';
export { MeetingPoll } from './collaboration/meeting-poll.entity';
export {
  BreakoutRoom,
  BreakoutRoomStatus,
} from './collaboration/breakout-room.entity';
export { BreakoutRoomParticipant } from './collaboration/breakout-room-participant.entity';

// Content & Templates
export {
  SummaryTemplate,
  SummaryTemplatePurpose,
} from './content/summary-template.entity';
export type { TemplateSectionDef } from './content/summary-template.entity';

// Content & Analytics
export { TranscriptChunk } from './content/transcript-chunk.entity';
export { Summary } from './content/summary.entity';
export { Attachment, AttachmentType } from './content/attachment.entity';

// AI Features
export { ChatHistory, ChatMessageType } from './ai/chat-history.entity';
