# MeetMind - API Documentation

**API Version:** 1.0.0 (MVP - Auth & Meetings with LiveKit WebRTC)
**Base URL:** `http://localhost:3000`

---

## 📌 Overview

This document outlines all planned API endpoints for MeetMind. Endpoints are organized by feature module and will be implemented incrementally.

---

## 🔐 Authentication

### Authentication Header
All authenticated endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
```

### Response Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## 🔐 Authentication (Google OAuth)

### Overview
MeetMind uses **Google OAuth 2.0** authentication (like Google Meet). Users sign in with their Gmail account. User name is automatically populated from their Google profile.

### 1. Initiate Google Sign-In
```
GET /auth/google
```

Redirects user to Google OAuth consent screen.

**Flow:**
```
Frontend button click "Sign in with Google"
   ↓
Redirect to: GET /auth/google
   ↓
User sees Google consent screen
   ↓
User signs in with Google account
   ↓
```

**Status:** ✅ Implemented

---

### 2. Google OAuth Callback
```
GET /auth/google/callback?code=AUTHORIZATION_CODE&state=STATE
```

Handles the OAuth callback from Google. Backend creates/updates user account and issues JWT token.

**Automatic Flow:**
1. Google redirects to this endpoint with authorization code
2. Backend exchanges code for user profile (email, name, picture)
3. Backend creates or retrieves user account
4. Backend generates JWT token
5. Redirects to frontend with token: `http://localhost:3001/auth/callback?token=<JWT_TOKEN>`

**Response (302):**
```
Redirects to: {FRONTEND_URL}/auth/callback?token=eyJhbGciOiJIUzI1NiIs...
```

**Status:** ✅ Implemented

---

### 3. Verify Current Session
```
GET /auth/verify
Authorization: Bearer <JWT_TOKEN>
```

Verifies JWT token and returns current user.

**Response (200):**
```json
{
  "isAuthenticated": true,
  "user": {
    "id": "user-uuid",
    "email": "user@gmail.com",
    "firstName": "John",
    "lastName": "Doe",
    "picture": "https://lh3.googleusercontent.com/..."
  }
}
```

**Response (401 - Unauthorized):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Status:** ✅ Implemented

---

### How It Works (User Flow)

```
1. User visits MeetMind frontend
   ↓
2. Frontend displays "Sign in with Google" button
   ↓
3. User clicks button
   ↓
4. Frontend redirects to: GET /auth/google
   ↓
5. User sees Google OAuth consent screen
   ↓
6. User signs in with their Gmail account
   ↓
7. Google approves and redirects to: GET /auth/google/callback?code=...
   ↓
8. Backend:
   - Exchanges code for user profile
   - Extracts: email, firstName, lastName, picture from Google
   - Creates user account if new, or returns existing
   - Generates JWT token (24h expiry)
   ↓
9. Backend redirects to: http://localhost:3001/auth/callback?token=<JWT_TOKEN>
   ↓
10. Frontend stores JWT in localStorage
    ↓
11. Frontend adds "Authorization: Bearer <token>" to all API requests
    ↓
12. User can now access all protected endpoints
```

### User Data from Gmail

| Google Profile | MeetMind User | Notes |
|---|---|---|
| Email | email | Gmail address (unique) |
| Given Name | firstName | From Google account profile |
| Family Name | lastName | From Google account profile |
| Photo | picture | Google account profile picture URL |
| ID | googleId | Internal - maps Gmail to user |

**Example User Created from Google:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@gmail.com",
  "firstName": "John",
  "lastName": "Doe",
  "picture": "https://lh3.googleusercontent.com/a/AGNmyxY...",
  "googleId": "1234567890123456789",
  "isActive": true,
  "createdAt": "2026-03-17T10:00:00Z"
}
```

---

## 👤 User Endpoints

### 1. Get Current User Profile
```
GET /users/me
Authorization: Bearer <JWT_TOKEN>
```

**Required:** Valid JWT token in Authorization header

**Response (200):**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "isActive": true,
  "createdAt": "2026-03-15T10:00:00Z"
}
```

**Response (401):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Status:** ✅ Implemented

---

## 📅 Meeting Endpoints

### 1. List All Meetings
```
GET /meetings
Authorization: Bearer <JWT_TOKEN>
```

Returns all meetings where user is organizer or participant.

**Response (200):**
```json
[
  {
    "id": "meeting-uuid",
    "title": "Q1 Planning",
    "description": "Quarterly planning meeting",
    "status": "completed",
    "startTime": "2026-03-15T10:00:00Z",
    "endTime": "2026-03-15T11:00:00Z",
    "duration": 3600,
    "organizerId": "user-uuid",
    "livekitRoomName": "meeting-uuid",
    "createdAt": "2026-03-15T09:00:00Z"
  }
]
```

**Status:** ✅ Implemented

---

### 2. Create Meeting
```
POST /meetings
Authorization: Bearer <JWT_TOKEN>
```

Creates a new meeting and LiveKit room. Organizer automatically gets all permissions.

**Request:**
```json
{
  "title": "Q1 Planning",
  "description": "Quarterly planning meeting",
  "startTime": "2026-03-20T10:00:00Z"
}
```

**Response (201):**
```json
{
  "id": "meeting-uuid",
  "title": "Q1 Planning",
  "description": "Quarterly planning meeting",
  "status": "scheduled",
  "startTime": "2026-03-20T10:00:00Z",
  "organizerId": "user-uuid",
  "livekitRoomName": "meeting-uuid",
  "createdAt": "2026-03-15T10:00:00Z"
}
```

**Status:** ✅ Implemented

---

### 3. Get Meeting Preview (No Auth - For Sharing)
```
GET /meetings/:id/public
```

Anyone can view meeting details before joining (no authentication required).

**Response (200):**
```json
{
  "id": "meeting-uuid",
  "title": "Q1 Planning",
  "description": "Quarterly planning meeting",
  "status": "scheduled",
  "startTime": "2026-03-20T10:00:00Z",
  "organizerName": "John Doe",
  "participantCount": 2,
  "createdAt": "2026-03-15T09:00:00Z"
}
```

**Status:** ✅ Implemented

---

### 4. Get Meeting Details (Auth Required)
```
GET /meetings/:id
Authorization: Bearer <JWT_TOKEN>
```

Full meeting details including all participants and permissions.

**Response (200):**
```json
{
  "id": "meeting-uuid",
  "title": "Q1 Planning",
  "description": "Quarterly planning meeting",
  "status": "completed",
  "startTime": "2026-03-15T10:00:00Z",
  "endTime": "2026-03-15T11:00:00Z",
  "duration": 3600,
  "organizerId": "user-uuid",
  "livekitRoomName": "meeting-uuid",
  "participants": [
    {
      "id": "participant-uuid",
      "userId": "user-uuid",
      "isOrganizer": true,
      "permissions": ["edit_summary", "chat_with_ai", "update_permissions", "view_transcript", "download_recording", "edit_meeting_info"],
      "joinedAt": "2026-03-15T10:00:00Z"
    }
  ],
  "createdAt": "2026-03-15T09:00:00Z",
  "updatedAt": "2026-03-15T11:00:00Z"
}
```

**Status:** ✅ Implemented

---

### 5. Update Meeting
```
PUT /meetings/:id
Authorization: Bearer <JWT_TOKEN>
```

**Required:** User must be meeting organizer

**Request:**
```json
{
  "title": "Q1 Planning - Updated",
  "description": "Updated description",
  "startTime": "2026-03-20T11:00:00Z"
}
```

**Response (200):**
```json
{
  "id": "meeting-uuid",
  "title": "Q1 Planning - Updated",
  "description": "Updated description",
  "startTime": "2026-03-20T11:00:00Z",
  "updatedAt": "2026-03-15T12:00:00Z"
}
```

**Status:** ✅ Implemented

---

### 6. Delete Meeting
```
DELETE /meetings/:id
Authorization: Bearer <JWT_TOKEN>
```

**Required:** User must be meeting organizer

**Response (204):** No content

**Status:** ✅ Implemented

---

### 7. Join Meeting
```
POST /meetings/:id/join
Authorization: Bearer <JWT_TOKEN>
```

Joins a meeting and generates a LiveKit access token. Updates meeting status from SCHEDULED to ONGOING on first join.

**Request:** (no body required)

**Response (200):**
```json
{
  "meetingId": "meeting-uuid",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "liveKitUrl": "wss://your-project.livekit.cloud",
  "participants": [
    {
      "id": "participant-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "isOrganizer": true,
      "permissions": ["edit_summary", "chat_with_ai", ...],
      "joinedAt": "2026-03-15T10:00:00Z"
    }
  ]
}
```

**Status:** ✅ Implemented

---

### 8. End Meeting
```
POST /meetings/:id/end
Authorization: Bearer <JWT_TOKEN>
```

Ends a meeting, deletes the LiveKit room, and calculates duration.

**Required:** User must be meeting organizer

**Response (200):**
```json
{
  "id": "meeting-uuid",
  "status": "completed",
  "endTime": "2026-03-15T11:00:00Z",
  "duration": 3600,
  "livekitRoomName": "meeting-uuid"
}
```

**Status:** ✅ Implemented

---

### 9. Get Meeting Participants
```
GET /meetings/:id/participants
Authorization: Bearer <JWT_TOKEN>
```

Returns all participants in a meeting with their permissions.

**Response (200):**
```json
[
  {
    "id": "participant-uuid",
    "userId": "user-uuid",
    "user": {
      "id": "user-uuid",
      "email": "organizer@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "meetingId": "meeting-uuid",
    "isOrganizer": true,
    "permissions": ["edit_summary", "chat_with_ai", "update_permissions", "view_transcript", "download_recording", "edit_meeting_info"],
    "joinedAt": "2026-03-15T10:00:00Z"
  },
  {
    "id": "participant-uuid-2",
    "userId": "user-uuid-2",
    "user": {
      "id": "user-uuid-2",
      "email": "participant@example.com",
      "firstName": "Jane",
      "lastName": "Smith"
    },
    "meetingId": "meeting-uuid",
    "isOrganizer": false,
    "permissions": [],
    "joinedAt": "2026-03-15T10:05:00Z"
  }
]
```

**Status:** ✅ Implemented

---

### 9. Grant Permissions to Participant
```
POST /meetings/:id/participants/:participantEmail/permissions
```

**Required:** User must be organizer or have grant_permissions permission

**Request:**
```json
{
  "permissions": ["edit_summary", "ai_chatbot", "grant_permissions"]
}
```

**Response (200):**
```json
{
  "email": "viewer@gmail.com",
  "displayName": "Bob Johnson",
  "role": "editor",
  "permissions": ["edit_summary", "ai_chatbot", "grant_permissions"],
  "grantedBy": "organizer@gmail.com",
  "grantedAt": "2026-03-15T10:15:00Z"
}
```

**Status:** To Be Implemented

---

### 10. Revoke Permissions from Participant
```
DELETE /meetings/:id/participants/:participantEmail/permissions
```

**Required:** User must be organizer or have grant_permissions permission

**Request:**
```json
{
  "permissions": ["edit_summary", "grant_permissions"]
}
```

**Response (200):**
```json
{
  "email": "editor@gmail.com",
  "displayName": "Jane Smith",
  "role": "participant",
  "permissions": ["ai_chatbot"],
  "revokedAt": "2026-03-15T10:20:00Z"
}
```

**Status:** To Be Implemented

---

## 📝 Transcript Endpoints

### 1. Get Transcript
```
GET /meetings/:id/transcript
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "id": "transcript-uuid",
  "meetingId": "meeting-uuid",
  "content": "Full transcript text...",
  "isProcessed": true,
  "processedAt": "2026-03-15T11:30:00Z",
  "createdAt": "2026-03-15T11:00:00Z"
}
```

**Status:** To Be Implemented

---

### 2. Get Meeting Summary
```
GET /meetings/:id/transcript/summary
```

**Response (200):**
```json
{
  "id": "transcript-uuid",
  "meetingId": "meeting-uuid",
  "summary": "In this meeting, the team discussed Q1 planning...",
  "keyPoints": [
    "Discussed new feature roadmap",
    "Allocated budget for Q1",
    "Scheduled follow-up meeting for March 20"
  ],
  "actionItems": [
    "John Doe - Prepare detailed roadmap by March 17",
    "Jane Smith - Create budget proposal by March 18"
  ],
  "isProcessed": true,
  "canEdit": true,
  "editedBy": "organizer@gmail.com",
  "editedAt": "2026-03-15T11:30:00Z"
}
```

**Status:** To Be Implemented

---

### 3. Edit Meeting Summary
```
PUT /meetings/:id/transcript/summary
```

**Required:** User must have `edit_summary` permission

**Request:**
```json
{
  "summary": "Updated summary with new insights...",
  "keyPoints": ["Point 1", "Point 2"],
  "actionItems": ["Action 1", "Action 2"]
}
```

**Response (200):**
```json
{
  "id": "transcript-uuid",
  "summary": "Updated summary with new insights...",
  "keyPoints": ["Point 1", "Point 2"],
  "actionItems": ["Action 1", "Action 2"],
  "editedBy": "editor@gmail.com",
  "editedAt": "2026-03-15T11:45:00Z"
}
```

**Response (403 - Forbidden):**
```json
{
  "message": "You don't have permission to edit this summary",
  "requiredPermission": "edit_summary"
}
```

**Status:** To Be Implemented

---

## 💬 Chatbot (RAG) Endpoints

### 1. Ask Question (AI Chatbot)
```
POST /meetings/:id/chat
```

**Required:** User must have `ai_chatbot` permission

**Request:**
```json
{
  "question": "What were the main action items discussed?"
}
```

**Response (200):**
```json
{
  "chatId": "chat-uuid",
  "question": "What were the main action items discussed?",
  "answer": "Based on the meeting transcript, the main action items were:\n1. John Doe to prepare detailed roadmap by March 17\n2. Jane Smith to create budget proposal by March 18",
  "relevantChunks": [
    {
      "id": "chunk-uuid",
      "content": "John mentioned he will prepare the detailed roadmap by March 17...",
      "chunkIndex": 5,
      "similarity": 0.92
    }
  ],
  "createdAt": "2026-03-15T12:00:00Z"
}
```

**Response (403 - Forbidden):**
```json
{
  "message": "You don't have permission to use the AI chatbot",
  "requiredPermission": "ai_chatbot",
  "contactOrganizer": "organizer@gmail.com"
}
```

**Status:** To Be Implemented

---

### 2. Get Chat History
```
GET /meetings/:id/chat-history
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `limit` - Results per page (default: 50)
- `offset` - Pagination offset (default: 0)

**Response (200):**
```json
{
  "data": [
    {
      "chatId": "chat-uuid-1",
      "question": "What were the main action items?",
      "answer": "...",
      "createdAt": "2026-03-15T12:00:00Z"
    },
    {
      "chatId": "chat-uuid-2",
      "question": "When is the follow-up meeting?",
      "answer": "...",
      "createdAt": "2026-03-15T12:05:00Z"
    }
  ],
  "total": 15,
  "limit": 50,
  "offset": 0
}
```

**Status:** To Be Implemented

---

### 3. Rate Chat Response (Feedback)
```
POST /meetings/:id/chat/:chatId/feedback
Authorization: Bearer <JWT_TOKEN>
```

**Request:**
```json
{
  "isHelpful": true,
  "feedback": "This answer was accurate and helpful"
}
```

**Response (200):**
```json
{
  "message": "Feedback recorded successfully"
}
```

**Status:** To Be Implemented

---

## 🔍 Search Endpoints (Future)

### 1. Search Across All Meetings
```
GET /search
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `q` - Search query (required)
- `type` - Filter by type (transcript, summary, actionItems)
- `startDate` - Filter by start date
- `endDate` - Filter by end date
- `limit` - Results per page (default: 20)

**Status:** Future Enhancement

---

## ⚠️ Error Handling

All errors follow this format:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Email must be valid"
    }
  ]
}
```

---

## 📚 Common Response Fields

### Pagination
```json
{
  "data": [...],
  "total": 100,
  "page": 0,
  "limit": 20,
  "hasMore": true
}
```

### Timestamps
All timestamps are in ISO 8601 format:
```
2026-03-15T10:00:00Z
```

---

## 🔄 Rate Limiting

- **Default:** 100 requests per minute per user
- **Auth endpoints:** 5 requests per minute per IP
- **Header:** `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## 📋 Implementation Status

| Endpoint | Status | Priority |
|----------|--------|----------|
| **Authentication (Google OAuth)** |  |  |
| GET /auth/google | ✅ Implemented | P0 |
| GET /auth/google/callback | ✅ Implemented | P0 |
| GET /auth/verify | ✅ Implemented | P0 |
| **Users** |  |  |
| GET /users/me | ✅ Implemented | P0 |
| **Meetings** |  |  |
| GET /meetings | ✅ Implemented | P0 |
| POST /meetings | ✅ Implemented | P0 |
| GET /meetings/:id/public | ✅ Implemented | P0 |
| GET /meetings/:id | ✅ Implemented | P0 |
| PUT /meetings/:id | ✅ Implemented | P0 |
| DELETE /meetings/:id | ✅ Implemented | P0 |
| POST /meetings/:id/join | ✅ Implemented | P0 |
| POST /meetings/:id/end | ✅ Implemented | P0 |
| GET /meetings/:id/participants | ✅ Implemented | P0 |
| **Permissions** |  |  |
| POST /meetings/:id/participants/:email/permissions | ❌ Not Started | P1 |
| DELETE /meetings/:id/participants/:email/permissions | ❌ Not Started | P1 |
| **Transcripts** |  |  |
| GET /meetings/:id/transcript | ❌ Not Started | P1 |
| GET /meetings/:id/transcript/summary | ❌ Not Started | P1 |
| PUT /meetings/:id/transcript/summary | ❌ Not Started | P1 |
| **Chat/RAG** |  |  |
| POST /meetings/:id/chat | ❌ Not Started | P1 |
| GET /meetings/:id/chat-history | ❌ Not Started | P2 |

---

**Last Updated:** 2026-03-16
**Next Review:** Before implementing permission management and transcripts
