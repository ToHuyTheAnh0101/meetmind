# MeetMind - System Architecture

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Frontend Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Meeting Room │  │   Dashboard  │  │  Chatbot Interface   │   │
│  │ (LiveKit)    │  │ (Meetings)   │  │ (RAG with Gemini)    │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└──────────────────┬─────────────────────┬────────────────────────┘
                   │                     │
                   ▼                     ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Backend API Layer (NestJS)                    │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────────┐   │
│  │   Auth   │  │  Meetings │  │ Transcr. │  │   Chatbot    │   │
│  │   (JWT)  │  │ (LiveKit) │  │ (Gemini) │  │   (RAG)      │   │
│  └──────────┘  └───────────┘  └──────────┘  └──────────────┘   │
└──────────────────┬──────────────────────┬────────────────────────┘
                   │                      │
        ┌──────────▼──────────┐    ┌──────▼────────┐
        │   AI Services       │    │  Data Access  │
        │ (Gemini, Embeddings)│    │   (TypeORM)   │
        └──────────┬──────────┘    └──────┬────────┘
                   │                      │
                   ▼                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Data & Storage Layer                           │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────┐    │
│  │  PostgreSQL     │  │  pgvector Store  │  │    Redis     │    │
│  │  (Users, Mtgs)  │  │  (Embeddings)    │  │  (Cache)     │    │
│  └─────────────────┘  └──────────────────┘  └──────────────┘    │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    External Services                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  LiveKit SFU │  │ Gemini API   │  │ Google Speech-to-Text│   │
│  │  (Cloud)     │  │   (LLM)      │  │    (STT)             │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Processing Workflow

### Stage 1: Real-time Reception & Security

```
User Join Meeting
      │
      ▼
WebRTC Connection (LiveKit/Jitsi)
      │
      ├─► Audio Stream ──── DTLS Encryption ──┐
      │                                        │
      └─► Video Stream ──── SRTP Encryption ──┤
                                               ▼
                            Backend Audio Receiver
                                               │
                                               ▼
                            STT Engine (Google/Whisper)
                                               │
                                               ▼
                            Raw Transcript Text
```

### Stage 2: Processing Pipeline

```
                    Raw Transcript
                           │
             ┌─────────────┴─────────────┐
             │                           │
        STREAM 1                    STREAM 2
    (Summarization)            (Vectorization)
        │                       │
        ▼                       ▼
   Gemini 1.5 Flash      Text Chunking
        │                │
        ├─► Summary      ├─► Chunk 1
        ├─► Action Items ├─► Chunk 2
        └─► Key Points   └─► Chunk N
        │                │
        ▼                ▼
   Dashboard Display  Embedding Generation
                     (Gemini/BGE-M3)
                     │
                     ▼
                PostgreSQL pgvector
                (Vector Storage)
```

### Stage 3: Query & Retrieval (RAG)

```
User Question
      │
      ▼
Chatbot Input
      │
      ▼
Generate Question Embedding
      │
      ▼
Vector Similarity Search (pgvector)
      │
      ▼
Retrieve Top-K Similar Chunks
      │
      ▼
Construct Context
      │
      ▼
Gemini 1.5 Flash (Answer Generation)
      │
      ▼
Return Answer to User
```

---

## 🔧 Technology Stack

### Backend
- **Framework:** NestJS 10+
- **Language:** TypeScript
- **ORM:** TypeORM
- **Database:** PostgreSQL 14+
- **Vector Extension:** pgvector

### Security
- **Auth:** JWT (jsonwebtoken)
- **Password:** bcrypt
- **Transport:** HTTPS/TLS
- **Media:** DTLS, SRTP

### AI & ML
- **LLM:** Google Gemini 1.5 Flash
- **Embeddings:** Gemini Embedding API (MVP) / BGE-M3 (Future)
- **STT:** Google Cloud Speech-to-Text / OpenAI Whisper

### Real-time Communication
- **Framework:** WebRTC
- **Server:** LiveKit or Jitsi
- **Signaling:** WebSocket

### Caching & Sessions
- **Cache Store:** Redis
- **Session Management:** Redis / JWT

### DevOps
- **Containerization:** Docker
- **Orchestration:** Docker Compose (development)
- **CI/CD:** GitHub Actions (planned)

---

## 🔐 Permission Architecture

### Role Hierarchy

```
Meeting Organizer (Creator)
    │
    ├─► Edit Summary ✓
    ├─► AI Chatbot ✓
    ├─► Grant Permissions ✓
    ├─► Revoke Permissions ✓
    └─► Delete Meeting ✓

        ↓ (can grant)

Editor (Permission Granted)
    │
    ├─► Edit Summary ✓
    ├─► AI Chatbot ✓
    ├─► Grant Permissions ✓
    ├─► Revoke Permissions ✓
    └─► Delete Meeting ✗

        ↓ (cannot grant)

Participant (Default Joiner)
    │
    ├─► Edit Summary ✗
    ├─► AI Chatbot ✗
    ├─► Grant Permissions ✗
    └─► View Summary ✓
```

### Permission Database Model

```
meeting_participants Table:
- participant_id (UUID)
- meeting_id (UUID) FK
- email (string)
- role (enum: organizer, editor, participant)
- permissions (jsonb array: ['edit_summary', 'ai_chatbot', 'grant_permissions'])
- joined_at (timestamp)
- granted_by (email, who granted permissions)
- granted_at (timestamp)

Permission Checks:
- Can edit summary? → Check 'edit_summary' in permissions
- Can use chatbot? → Check 'ai_chatbot' in permissions
- Can grant perms? → Check 'grant_permissions' in permissions
```

### Permission Grant Flow

```
Endpoint: POST /meetings/:id/participants/:email/permissions

1. Verify requester has 'grant_permissions' permission
2. Verify target participant exists in meeting
3. Update permissions for target participant
4. Add to audit log (who granted, when, what)
5. Notify participant (optional: send notification)
6. Return updated participant with new permissions
```

### Editing History & Tracking

```
transcript_edits Table:
- edit_id (UUID)
- transcript_id (UUID) FK
- edited_by (email)
- edited_at (timestamp)
- previous_summary (text)
- new_summary (text)
- change_type (enum: created, modified, reverted)
```

---

## 📦 Module Structure

### Backend Module Organization

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts      ✅ Updated (Google OAuth)
│   │   ├── auth.service.ts         ✅ Updated (token generation)
│   │   ├── auth.module.ts          ✅ Updated (Google OAuth)
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts     ✅ Implemented
│   │   │   └── google.strategy.ts  ✅ Implemented (NEW)
│   │   └── guards/
│   │       ├── jwt-auth.guard.ts   ✅ Implemented
│   │       └── google-auth.guard.ts ✅ Implemented (NEW)
│   │
│   ├── users/
│   │   ├── users.controller.ts     ✅ Implemented
│   │   ├── users.service.ts        ✅ Implemented
│   │   ├── users.module.ts         ✅ Implemented
│   │   ├── user.entity.ts          ✅ Implemented
│   │   └── dto/
│   │       └── user-profile.dto.ts ✅ Implemented
│   │
│   ├── livekit/
│   │   ├── livekit.service.ts      ✅ Implemented
│   │   └── livekit.module.ts       ✅ Implemented
│   │
│   ├── meetings/
│   │   ├── meetings.controller.ts  ✅ Implemented
│   │   ├── meetings.service.ts     ✅ Implemented
│   │   ├── meetings.module.ts      ✅ Implemented
│   │   ├── meeting.entity.ts       ✅ Implemented (+ livekitRoomName)
│   │   ├── meeting-participant.entity.ts ✅ Implemented
│   │   ├── transcript.entity.ts    ✅ Implemented
│   │   ├── transcript-chunk.entity.ts ✅ Implemented
│   │   └── dto/
│   │       ├── create-meeting.dto.ts    ✅ Implemented
│   │       ├── update-meeting.dto.ts    ✅ Implemented
│   │       └── join-meeting-response.dto.ts ✅ Implemented
│   │
│   ├── ai/
│   │   ├── ai.service.ts
│   │   └── ai.module.ts
│   │
│   └── chat/
│       ├── chat.controller.ts
│       ├── chat.service.ts
│       ├── chat.module.ts
│       └── dto/
│
├── common/
│   ├── guards/
│   │   └── role.guard.ts
│   ├── interceptors/
│   │   └── logging.interceptor.ts
│   ├── decorators/
│   │   └── roles.decorator.ts
│   └── filters/
│       └── http-exception.filter.ts
│
├── config/
│   ├── database.config.ts
│   └── ai.config.ts
│
├── types/
│   └── index.ts
│
├── app.module.ts              ✅ Updated (wired all modules)
└── main.ts
```

---

## 🔄 API Flow Example: Ask Question About Meeting

```
1. User opens Dashboard
   └─► GET /meetings
       └─► Returns list of past meetings

2. User clicks on a meeting
   └─► GET /meetings/:id
       └─► Returns meeting details with summary

3. User asks a question in chatbot
   └─► POST /meetings/:id/chat
       └─► Request body: { question: "What were the action items?" }

4. Backend Processing:
   a) Generate embedding of question
      └─► Call Gemini Embedding API

   b) Vector similarity search
      └─► Query pgvector for top-5 similar chunks

   c) Build context from retrieved chunks
      └─► Combine top chunks into context string

   d) Generate answer
      └─► Call Gemini 1.5 Flash with context + question

   e) Return response
      └─► Send answer back to frontend

5. Response: { answer: "Based on the meeting, the action items are..." }
```

---

## 🔐 Security Architecture

### Authentication Flow (Google OAuth 2.0)
```
User Visits Website
   │
   ▼
Click "Sign in with Google" Button
   │
   ▼
Redirect to: GET /auth/google
   │
   ▼
User sees Google OAuth Consent Screen
   │
   ▼
User Signs In with Gmail Account
   │
   ▼
Google Approves & Redirects to: GET /auth/google/callback?code=...
   │
   ▼
Backend Processes:
   1. Exchange code for user profile
   2. Extract: email, firstName, lastName, picture
   3. Create/retrieve user in PostgreSQL
   4. Generate JWT token (24h expiry)
   │
   ▼
Redirect to: {FRONTEND_URL}/auth/callback?token=<JWT_TOKEN>
   │
   ▼
Frontend Stores JWT in localStorage/sessionStorage
   │
   ▼
All Subsequent Requests:
   └─► Authorization: Bearer <JWT_TOKEN>

Frontend Validates Token Expiry (24h default)
   │
   ▼
User Authenticated & Can Access Protected Endpoints
```

### Data Encryption
```
WebRTC Meeting (LiveKit):
  Audio/Video ──► SRTP ────────────────┐
  Signaling ────► DTLS ────────────────┤──► End-to-End Encrypted

OAuth Token Management:
  Google OAuth ──► Authorization Code ─┐
  Token ──────────► JWT (HS256) ───────├──► Secure Storage
  Claims ─────────► { sub, email, iat, exp }

API Communication:
  All data ──────► HTTPS/TLS ──────────────► Transport Secure
```

---

## 🚀 Scalability Considerations

### Horizontal Scaling
- **Stateless API:** NestJS services can be deployed across multiple instances
- **Load Balancer:** Nginx/HAProxy for API distribution
- **Database Connection Pool:** TypeORM with configurable pool size
- **Redis Cluster:** For distributed caching and session management

### Vertical Scaling
- **Database:** PostgreSQL can handle increased connections and queries
- **pgvector:** Indexes for fast similarity searches
- **Caching:** Redis reduces database load

### Performance Optimization
- **Vector Indexing:** Use pgvector HNSW indexes for faster searches
- **Transcript Chunking:** Semantic chunking for better relevance
- **Embedding Caching:** Cache embeddings to avoid recomputation
- **Query Pagination:** Implement pagination for large result sets

---

## 📝 Future Architecture Enhancements

1. **Event-Driven Architecture**
   - Kafka/RabbitMQ for async processing
   - Event sourcing for audit logs

2. **Microservices**
   - Separate AI Service
   - Separate WebRTC Signaling Service
   - Separate Transcription Service

3. **Advanced Caching**
   - Multi-level caching strategy
   - Cache invalidation policies

4. **Data Pipeline**
   - Apache Airflow for batch processing
   - dbt for data transformation

5. **Monitoring & Observability**
   - Prometheus for metrics
   - ELK Stack for logging
   - Jaeger for distributed tracing

---

## 📚 References

- [NestJS Documentation](https://docs.nestjs.com)
- [TypeORM Documentation](https://typeorm.io)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [WebRTC Documentation](https://webrtc.org)
- [Gemini API Docs](https://ai.google.dev/docs)

---

**Last Updated:** 2026-03-15
**Next Review:** When new components are added
