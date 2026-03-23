# MeetMind Database Entities

Complete reference for all database entities in the MeetMind system.

## Entity Relationship Diagram

```
User (1) ──────────────────────┐
  │                             │
  ├──> (1-N) organizedMeetings  ├──> Meeting (1) ──────────────────────────┐
  │                             │                                           │
  ├──> (N) meetingParticipations│                                           ├──> (1-N) participants (Participant)
  │                             │                                           │
  └────────────────────────────┴──────────────────────────────────────────┤
                                  │
                                  ├──> (1-N) events (MeetingEvent)
                                  │
                                  ├──> (1-N) qaQuestions (MeetingQuestion)
                                  │
                                  ├──> (1-N) polls (MeetingPoll)
                                  │
                                  ├──> (1-N) transcriptChunks (TranscriptChunk)
                                  │
                                  ├──> (1-1) summary (Summary)
                                  │
                                  ├──> (1-N) attachments (Attachment)
                                  │
                                  ├──> (1-N) notifications (Notification)
                                  │
                                  ├──> (1-N) breakoutRooms (BreakoutRoom)
                                  │
                                  ├──> (1-N) participantSessions (ParticipantSession)
                                  │
                                  ├──> (1-N) accessRequests (AccessRequest)
                                  │
                                  ├──> (1-N) aiChatHistories (ChatHistory)
                                  │
                                  └──> (0-1) template (SummaryTemplate) [onDelete: SET NULL]

BreakoutRoom (1) ──────────────> (1-N) participants (BreakoutRoomParticipant)
```

## Core Entities

### User

**Table**: `users`
**Path**: `src/modules/users/user.entity.ts`

User profiles with OAuth and authentication support.

| Field | Type | Nullable | Unique | Description |
|-------|------|----------|--------|-------------|
| id | UUID | NO | YES | Primary key (auto-generated) |
| email | String | NO | YES | User email address |
| firstName | String | NO | NO | User first name |
| lastName | String | NO | NO | User last name |
| googleId | String | YES | NO | Google OAuth identifier |
| picture | String | YES | NO | Profile picture URL from OAuth provider |
| isActive | Boolean | NO | NO | Account active status (default: true) |
| createdAt | Date | NO | NO | Record creation timestamp |
| updatedAt | Date | NO | NO | Last update timestamp |

**Relations**:
- `organizedMeetings`: One-to-Many with Meeting (user organizes meetings)
- `meetingParticipations`: One-to-Many with Participant (cascade delete)

---

### Meeting

**Table**: `meetings`
**Path**: `src/modules/meetings/entities/core/meeting.entity.ts`

Core meeting entity representing a scheduled/ongoing/completed meeting.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | NO | Primary key |
| title | String | NO | Meeting title |
| description | String | YES | Meeting description |
| status | Enum | NO | Meeting status (see MeetingStatus enum) |
| startTime | Date | NO | Scheduled start time |
| endTime | Date | YES | Actual/scheduled end time |
| recordingUrl | String | YES | URL to meeting recording |
| organizerId | UUID | NO | Foreign key to organizing User |
| templateId | UUID | YES | Foreign key to SummaryTemplate (can be NULL) |
| livekitRoomName | String | YES | LiveKit video room identifier |
| createdAt | Date | NO | Record creation timestamp |
| updatedAt | Date | NO | Last update timestamp |

**Enums**:
```typescript
enum MeetingStatus {
  SCHEDULED = 'scheduled',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}
```

**Relations**:
- `organizer` (ManyToOne): User who organized the meeting
- `participants` (OneToMany, cascade): Participant entities
- `events` (OneToMany, cascade): MeetingEvent entities
- `qaQuestions` (OneToMany, cascade): MeetingQuestion entities
- `polls` (OneToMany, cascade): MeetingPoll entities
- `transcriptChunks` (OneToMany): TranscriptChunk entities
- `summary` (OneToOne, cascade): Summary entity
- `attachments` (OneToMany, cascade): Attachment entities
- `notifications` (OneToMany, cascade): Notification entities
- `breakoutRooms` (OneToMany, cascade): BreakoutRoom entities
- `participantSessions` (OneToMany, cascade): ParticipantSession entities
- `accessRequests` (OneToMany, cascade): AccessRequest entities
- `aiChatHistories` (OneToMany, cascade): ChatHistory entities
- `template` (ManyToOne): SummaryTemplate (on delete: SET NULL)

---

### Participant

**Table**: `participants`
**Path**: `src/modules/meetings/entities/core/participant.entity.ts`

Represents a user's participation in a meeting with permissions.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | NO | Primary key |
| meetingId | UUID | NO | Foreign key to Meeting (cascade delete) |
| userId | UUID | NO | Foreign key to User (cascade delete) |
| permissions | JSON Array | NO | Array of MeetingPermission enums (default: []) |
| isOrganizer | Boolean | NO | Whether user is the meeting organizer (default: false) |
| joinedAt | Date | NO | Timestamp when user joined |
| updatedAt | Date | NO | Last update timestamp |

**Enums**:
```typescript
enum MeetingPermission {
  EDIT_SUMMARY = 'edit_summary',
  CHAT_WITH_AI = 'chat_with_ai',
  UPDATE_PERMISSIONS = 'update_permissions',
  VIEW_TRANSCRIPT = 'view_transcript',
  DOWNLOAD_RECORDING = 'download_recording',
  EDIT_MEETING_INFO = 'edit_meeting_info'
}
```

**Relations**:
- `meeting` (ManyToOne, cascade delete): Parent Meeting
- `user` (ManyToOne, cascade delete): Participating User

---

## Collaboration Entities

### MeetingEvent

**Table**: `events`
**Path**: `src/modules/meetings/entities/collaboration/meeting-event.entity.ts`

Real-time events that occur during a meeting.

**Index**: `[meetingId]`

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | NO | Primary key |
| meetingId | UUID | NO | Foreign key to Meeting (cascade delete) |
| triggeredByUserId | UUID | NO | User who triggered the event (cascade delete) |
| type | Enum | NO | Event type (see EventType enum) |
| metadata | JSON | YES | Additional event data |
| createdAt | Date | NO | Timestamp when event occurred |

**Enums**:
```typescript
enum EventType {
  SCREEN_SHARE_START = 'screen_share_start',
  SCREEN_SHARE_END = 'screen_share_end',
  POLL_STARTED = 'poll_started',
  POLL_ENDED = 'poll_ended',
  QA_OPENED = 'qa_opened',
  QA_CLOSED = 'qa_closed',
  RECORDING_STARTED = 'recording_started',
  RECORDING_STOPPED = 'recording_stopped'
}
```

**Relations**:
- `meeting` (ManyToOne, cascade delete): Parent Meeting
- `triggeredByUser` (ManyToOne, cascade delete): User who triggered event

---

### MeetingQuestion

**Table**: `questions`
**Path**: `src/modules/meetings/entities/collaboration/meeting-question.entity.ts`

Q&A questions asked during a meeting.

**Index**: `[meetingId]`

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | NO | Primary key |
| meetingId | UUID | NO | Foreign key to Meeting (cascade delete) |
| askedByUserId | UUID | NO | User who asked the question (cascade delete) |
| content | String | NO | Question text |
| upvoterIds | UUID Array | NO | Array of user IDs who upvoted (default: []) |
| status | Enum | NO | Question status (see QuestionStatus enum) |
| answer | String | YES | Answer text |
| offsetSeconds | Number | YES | Meeting timestamp when asked (seconds) |
| answeredByUserId | UUID | YES | User who answered (nullable, cascade delete if deleted) |
| answeredAt | Date | YES | When the question was answered |
| createdAt | Date | NO | Question creation timestamp |
| updatedAt | Date | NO | Last update timestamp |

**Enums**:
```typescript
enum QuestionStatus {
  PENDING = 'pending',
  ANSWERED = 'answered',
  DISMISSED = 'dismissed'
}
```

**Relations**:
- `meeting` (ManyToOne, cascade delete): Parent Meeting
- `askedByUser` (ManyToOne, cascade delete): User who asked
- `answeredByUser` (ManyToOne, set null): User who answered

---

### MeetingPoll

**Table**: `polls`
**Path**: `src/modules/meetings/entities/collaboration/meeting-poll.entity.ts`

Polls conducted during a meeting.

**Index**: `[meetingId]`

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | NO | Primary key |
| meetingId | UUID | NO | Foreign key to Meeting (cascade delete) |
| createdByUserId | UUID | NO | User who created the poll (cascade delete) |
| question | String | NO | Poll question text |
| type | Enum | NO | Poll type (SINGLE or MULTIPLE) |
| options | JSON Array | NO | Array of {id, text, voterIds} objects |
| status | Enum | NO | Poll status (see PollStatus enum) |
| offsetSeconds | Number | YES | Meeting timestamp when poll started (seconds) |
| closedAt | Date | YES | When the poll was closed |
| createdAt | Date | NO | Poll creation timestamp |
| updatedAt | Date | NO | Last update timestamp |

**Enums**:
```typescript
enum PollType {
  SINGLE = 'single',
  MULTIPLE = 'multiple'
}

enum PollStatus {
  ACTIVE = 'active',
  CLOSED = 'closed'
}
```

**Option Structure**:
```json
{
  "id": "uuid",
  "text": "option text",
  "voterIds": ["uuid1", "uuid2"]
}
```

**Relations**:
- `meeting` (ManyToOne, cascade delete): Parent Meeting
- `createdByUser` (ManyToOne, cascade delete): Poll creator

---

### BreakoutRoom

**Table**: `breakout_rooms`
**Path**: `src/modules/meetings/entities/collaboration/breakout-room.entity.ts`

Separate video breakout rooms for group discussions.

**Index**: `[meetingId]`

| Field | Type | Nullable | Unique | Description |
|-------|------|----------|--------|-------------|
| id | UUID | NO | NO | Primary key |
| meetingId | UUID | NO | NO | Foreign key to Meeting (cascade delete) |
| name | String | NO | NO | Breakout room name |
| description | String | YES | NO | Room description |
| livekitRoomName | String | NO | YES | Unique LiveKit room identifier |
| maxParticipants | Number | YES | NO | Maximum allowed participants |
| status | Enum | NO | NO | Room status (see BreakoutRoomStatus enum) |
| createdByUserId | UUID | NO | NO | User who created the room (cascade delete) |
| startedAt | Date | YES | NO | When the room was activated |
| closedAt | Date | YES | NO | When the room was closed |
| createdAt | Date | NO | NO | Record creation timestamp |
| updatedAt | Date | NO | NO | Last update timestamp |

**Enums**:
```typescript
enum BreakoutRoomStatus {
  CREATED = 'created',
  ACTIVE = 'active',
  CLOSED = 'closed'
}
```

**Relations**:
- `meeting` (ManyToOne, cascade delete): Parent Meeting
- `createdByUser` (ManyToOne, cascade delete): Room creator
- `participants` (OneToMany, cascade): BreakoutRoomParticipant entities

---

### BreakoutRoomParticipant

**Table**: `breakout_room_participants`
**Path**: `src/modules/meetings/entities/collaboration/breakout-room-participant.entity.ts`

User participation in a breakout room.

**Index**: `[breakoutRoomId, userId]` (unique)

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | NO | Primary key |
| breakoutRoomId | UUID | NO | Foreign key to BreakoutRoom (cascade delete) |
| userId | UUID | NO | Foreign key to User (cascade delete) |
| createdAt | Date | NO | Join timestamp |
| updatedAt | Date | NO | Last update timestamp |

**Relations**:
- `breakoutRoom` (ManyToOne, cascade delete): Parent BreakoutRoom
- `user` (ManyToOne, cascade delete): Participating User

---

## Content Entities

### Summary

**Table**: `summaries`
**Path**: `src/modules/meetings/entities/content/summary.entity.ts`

Meeting summary (AI-generated or manual).

**Index**: `[meetingId]`

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | NO | Primary key |
| meetingId | UUID | NO | Foreign key to Meeting (cascade delete, one-to-one) |
| summaryText | Text | YES | Plain text summary |
| content | JSON | YES | Structured summary content by section |
| createdAt | Date | NO | Summary creation timestamp |
| updatedAt | Date | NO | Last update timestamp |

**Content Structure** (example):
```json
{
  "executive_summary": "...",
  "key_points": "...",
  "action_items": "...",
  "discussion": "..."
}
```

**Relations**:
- `meeting` (OneToOne, cascade delete): Parent Meeting (one-to-one relationship)

---

### SummaryTemplate

**Table**: `summary_templates`
**Path**: `src/modules/meetings/entities/content/summary-template.entity.ts`

Customizable templates for meeting summaries.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | NO | Primary key |
| name | String | NO | Template name |
| description | String | YES | Template description |
| purpose | Enum | NO | Template purpose (see SummaryTemplatePurpose enum) |
| sections | JSON Array | NO | Array of TemplateSectionDef objects |
| isSystem | Boolean | NO | Whether this is a platform-predefined template (default: false) |
| createdByUserId | UUID | YES | User who created the template (nullable, set null on delete) |
| createdAt | Date | NO | Creation timestamp |
| updatedAt | Date | NO | Last update timestamp |

**Enums**:
```typescript
enum SummaryTemplatePurpose {
  INTERVIEW = 'interview',
  REPORT = 'report',
  PROJECT_DISCUSSION = 'project_discussion',
  TEAM_MEETING = 'team_meeting',
  CUSTOM = 'custom'
}
```

**Section Definition**:
```typescript
interface TemplateSectionDef {
  name: string;           // machine key, e.g. "candidate_info"
  label: string;          // display label, e.g. "Candidate Information"
  description?: string;   // placeholder hint
  order: number;          // display order
}
```

**Relations**:
- `createdByUser` (ManyToOne, set null): Template creator

---

### TranscriptChunk

**Table**: `transcript_chunks`
**Path**: `src/modules/meetings/entities/content/transcript-chunk.entity.ts`

Meeting transcript broken into chunks for AI processing and semantic search.

**Index**: `[meetingId]`

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | NO | Primary key |
| meetingId | UUID | NO | Foreign key to Meeting (cascade delete) |
| content | Text | NO | Transcript chunk text |
| embedding | Vector(1536) | YES | OpenAI embedding vector (1536 dimensions) |
| chunkIndex | Number | YES | Sequential chunk number |
| startTime | Number | YES | Start time in meeting (seconds) |
| endTime | Number | YES | End time in meeting (seconds) |
| createdAt | Date | NO | Creation timestamp |

**Notes**:
- Vector column uses PostgreSQL pgvector extension
- 1536 dimensions is standard for OpenAI's `text-embedding-3-small` model
- Can be adjusted based on embedding model used

**Relations**:
- `meeting` (ManyToOne, cascade delete): Parent Meeting

---

### Attachment

**Table**: `attachments`
**Path**: `src/modules/meetings/entities/content/attachment.entity.ts`

Files and resources attached to meetings.

**Index**: `[meetingId]`

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | NO | Primary key |
| meetingId | UUID | NO | Foreign key to Meeting (cascade delete) |
| uploadedByUserId | UUID | NO | User who uploaded (cascade delete) |
| type | Enum | NO | Attachment type (see AttachmentType enum) |
| fileName | String | NO | Original file name |
| fileUrl | String | NO | URL to file storage |
| fileSize | Number | YES | File size in bytes |
| mimeType | String | YES | MIME type (e.g., "application/pdf") |
| createdAt | Date | NO | Upload timestamp |
| updatedAt | Date | NO | Last update timestamp |

**Enums**:
```typescript
enum AttachmentType {
  DOCUMENT = 'document',
  AUDIO = 'audio',
  LINK = 'link',
  VIDEO = 'video',
  IMAGE = 'image',
  OTHER = 'other'
}
```

**Relations**:
- `meeting` (ManyToOne, cascade delete): Parent Meeting
- `uploadedByUser` (ManyToOne, cascade delete): User who uploaded

---

## Tracking Entities

### ParticipantSession

**Table**: `participant_sessions`
**Path**: `src/modules/meetings/entities/tracking/participant-session.entity.ts`

Tracks individual participant sessions within a meeting for analytics.

**Index**: `[meetingId, userId]`, `[sessionToken]`

| Field | Type | Nullable | Unique | Description |
|-------|------|----------|--------|-------------|
| id | UUID | NO | NO | Primary key |
| meetingId | UUID | NO | NO | Foreign key to Meeting (cascade delete) |
| userId | UUID | NO | NO | Foreign key to User (cascade delete) |
| sessionToken | String | NO | YES | Unique session identifier |
| deviceInfo | String | YES | NO | User agent or device identifier |
| ipAddress | String | YES | NO | IP address of participant |
| joinedAt | Date | NO | NO | When participant joined |
| leftAt | Date | YES | NO | When participant left |
| duration | Number | YES | NO | Session duration in seconds |
| isActive | Boolean | NO | NO | Whether session is currently active (default: false) |
| createdAt | Date | NO | NO | Record creation timestamp |
| updatedAt | Date | NO | NO | Last update timestamp |

**Relations**:
- `meeting` (ManyToOne, cascade delete): Parent Meeting
- `user` (ManyToOne, cascade delete): Participating User

---

## AI Entities

### ChatHistory

**Table**: `chat_histories`
**Path**: `src/modules/meetings/entities/ai/chat-history.entity.ts`

Conversation history for AI chat during meetings.

**Index**: `[meetingId, userId]`, `[meetingId, createdAt]`

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | NO | Primary key |
| meetingId | UUID | NO | Foreign key to Meeting (cascade delete) |
| userId | UUID | NO | Foreign key to User (cascade delete) |
| messageType | Enum | NO | Message type (see ChatMessageType enum) |
| content | Text | NO | Message content |
| metadata | JSON | YES | Additional context (e.g., tokens used, model info) |
| createdAt | Date | NO | Message timestamp |

**Enums**:
```typescript
enum ChatMessageType {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system'
}
```

**Relations**:
- `meeting` (ManyToOne, cascade delete): Parent Meeting
- `user` (ManyToOne, cascade delete): User in conversation

---

## Scheduling Entities

### AccessRequest

**Table**: `access_requests`
**Path**: `src/modules/meetings/entities/scheduling/access-request.entity.ts`

Requests from users to join non-public meetings.

**Index**: `[meetingId]`

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | NO | Primary key |
| meetingId | UUID | NO | Foreign key to Meeting (cascade delete) |
| requesterUserId | UUID | NO | User requesting access (cascade delete) |
| status | Enum | NO | Request status (see AccessRequestStatus enum) |
| requestedAt | Date | NO | When access was requested |
| approvedAt | Date | YES | When request was approved |
| rejectedAt | Date | YES | When request was rejected |
| approvedByUserId | UUID | YES | User who approved (nullable, set null on delete) |
| rejectionReason | String | YES | Reason for rejection |
| createdAt | Date | NO | Record creation timestamp |
| updatedAt | Date | NO | Last update timestamp |

**Enums**:
```typescript
enum AccessRequestStatus {
  WAITING = 'waiting',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}
```

**Relations**:
- `meeting` (ManyToOne, cascade delete): Parent Meeting
- `requesterUser` (ManyToOne, cascade delete): User requesting
- `approvedByUser` (ManyToOne, set null): Approver User

---

### Notification

**Table**: `notifications`
**Path**: `src/modules/meetings/entities/scheduling/notification.entity.ts`

Notifications sent to participants about meeting status changes.

**Index**: `[meetingId]`

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | NO | Primary key |
| meetingId | UUID | NO | Foreign key to Meeting (cascade delete) |
| recipientUserId | UUID | NO | Notification recipient (cascade delete) |
| type | Enum | NO | Notification type (see NotificationType enum) |
| status | Enum | NO | Notification status (see NotificationStatus enum) |
| scheduledTime | Date | NO | When notification should be sent |
| sentTime | Date | YES | When notification was actually sent |
| failureReason | String | YES | Reason if sending failed |
| createdAt | Date | NO | Record creation timestamp |
| updatedAt | Date | NO | Last update timestamp |

**Enums**:
```typescript
enum NotificationType {
  SCHEDULED = 'scheduled',    // Immediately after scheduling
  REMINDER = 'reminder',      // Minutes before meeting
  CANCELLED = 'cancelled',    // When meeting is cancelled
  STARTED = 'started',        // When meeting starts
  ENDED = 'ended'            // When meeting ends
}

enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed'
}
```

**Relations**:
- `meeting` (ManyToOne, cascade delete): Parent Meeting
- `recipientUser` (ManyToOne, cascade delete): Notification recipient

---

## Cascade Delete Behavior

The following entities have cascade delete enabled, meaning when the parent entity is deleted, all children are also deleted:

- User → organizedMeetings (Meeting)
- User → meetingParticipations (Participant)
- Meeting → participants (Participant)
- Meeting → events (MeetingEvent)
- Meeting → qaQuestions (MeetingQuestion)
- Meeting → polls (MeetingPoll)
- Meeting → summary (Summary)
- Meeting → attachments (Attachment)
- Meeting → notifications (Notification)
- Meeting → breakoutRooms (BreakoutRoom)
- Meeting → participantSessions (ParticipantSession)
- Meeting → accessRequests (AccessRequest)
- Meeting → aiChatHistories (ChatHistory)
- BreakoutRoom → participants (BreakoutRoomParticipant)

**Exception**: Meeting → template (SummaryTemplate) uses `onDelete: 'SET NULL'` - template reference is cleared but template entity is preserved.

---

## Key Design Patterns

### UUID Primary Keys
All entities use UUID (`uuid`) as primary keys for distributed system compatibility.

### Timestamps
All entities include `createdAt` and `updatedAt` (except MeetingEvent and ChatHistory which only have `createdAt`).

### JSON/JSONB Columns
- `Participant.permissions`: Array of MeetingPermission enums
- `MeetingEvent.metadata`: Flexible metadata storage
- `MeetingQuestion.upvoterIds`: Array of voter UUIDs
- `MeetingPoll.options`: Structured poll options with voter tracking
- `Summary.content`: Structured summary sections
- `SummaryTemplate.sections`: Template section definitions
- `ChatHistory.metadata`: Message metadata (tokens, model info, etc.)

### Foreign Keys
Foreign key columns follow the pattern: `{entityName}Id` (e.g., `meetingId`, `userId`, `createdByUserId`)

### Indexes
Strategic indexes on:
- Meeting lookup by ID (implicit on primary key)
- Foreign key relationships (implicit)
- Frequently queried fields like `[meetingId]` for fast child entity lookups
- Unique constraints on sensitive fields (email, sessionToken, livekitRoomName)

---

**Last Updated**: 2026-03-21
**Total Entities**: 16
**Core Entities**: 2 | Collaboration: 5 | Content: 4 | Tracking: 1 | AI: 1 | Scheduling: 2
