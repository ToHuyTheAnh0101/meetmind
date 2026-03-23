# External Integrations

**Analysis Date:** 2026-03-22

## APIs & External Services

**Video Conferencing:**
- LiveKit - Real-time video conferencing and collaboration
  - SDK: `livekit-server-sdk` 2.15.0
  - Auth: Environment variables `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`
  - Implementation: `src/providers/livekit/livekit.service.ts`
  - Features: Token generation, room management, participant control, track muting

**AI Services:**
- Google Gemini API - AI-powered features
  - Base URL: `https://generativelanguage.googleapis.com/v1beta/models`
  - Auth: Environment variable `GEMINI_API_KEY`
  - Implementation: `src/providers/ai/ai.service.ts`
  - HTTP Client: axios
  - Features:
    - Meeting transcript summarization (`summarizeTranscript`)
    - Text embedding generation (`generateEmbedding` using `embedding-001` model)
    - Question answering with RAG (`answerQuestion` using `gemini-1.5-flash` model)

**OAuth & Identity:**
- Google OAuth 2.0 - User authentication and profile management
  - Auth: Environment variables `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
  - Strategy: `passport-google-oauth20` 2.0.0
  - Implementation: `src/modules/auth/strategies/google.strategy.ts`
  - Scopes: `email`, `profile`
  - Callback URL: Defaults to `http://localhost:3000/auth/google/callback`

## Data Storage

**Databases:**
- PostgreSQL - Primary database
  - Client: TypeORM 0.3.28 via `pg` 8.20.0 driver
  - Connection: Environment variables `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
  - Configuration: `src/app.module.ts` (TypeOrmModule.forRootAsync)
  - Schema synchronization: Enabled in development (`synchronize: true`), disabled in production
  - Database logging: Enabled in development mode

**Cache/Sessions (Optional):**
- Redis - Mentioned in `.env.example` but not yet integrated
  - Configuration: `REDIS_HOST`, `REDIS_PORT`
  - Status: Optional for caching/sessions

**File Storage:**
- Not detected - Local filesystem only (referenced: Google OAuth profile pictures stored as URLs)

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based system with Google OAuth integration
  - JWT Strategy: `src/modules/auth/strategies/jwt.strategy.ts`
    - Token extraction: Bearer token from Authorization header
    - Validation: User existence and active status check
  - Google Strategy: `src/modules/auth/strategies/google.strategy.ts`
    - Auto-creates/updates users on first login
    - Stores Google ID and profile picture URL
  - Token Generation: `src/modules/auth/auth.service.ts`
    - Payload: `{ sub: user.id, email: user.email }`
    - Expiration: Configurable via `JWT_EXPIRATION` environment variable (default: 24h)

**Endpoints:**
- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/google/callback` - Google OAuth callback handler
  - Redirects to frontend with JWT token in query parameter
  - Frontend URL: `FRONTEND_URL` environment variable
- `GET /auth/verify` - Verify JWT and retrieve user info (protected)

## Monitoring & Observability

**Error Tracking:**
- Not detected - No dedicated error tracking service integrated

**Logs:**
- NestJS built-in logging
  - Logger: `@nestjs/common` Logger class
  - Implementation: Used in LiveKitService and AiService for warnings/errors
  - Output: Console logging
  - Database logging: Enabled in development mode via TypeORM configuration

**HTTP Requests:**
- axios - Used for external API calls to Google Gemini API

## CI/CD & Deployment

**Hosting:**
- Not detected - Infrastructure agnostic (suitable for any Node.js host)

**CI Pipeline:**
- Not detected - No CI/CD configuration files found

**Build Commands:**
```bash
npm run build              # Compile TypeScript to dist/
npm run start:prod         # Run compiled production build
npm run start:dev          # Development mode with watch
npm run start:debug        # Debug mode with inspect
```

## Environment Configuration

**Required env vars:**
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - PostgreSQL connection
- `JWT_SECRET` - JWT signing key
- `JWT_EXPIRATION` - Token expiration (default: 24h)
- `CORS_ORIGIN` - CORS allowed origin (default: http://localhost:3001)
- `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL` - LiveKit configuration
- `GEMINI_API_KEY` - Google Gemini API key

**Optional env vars:**
- `FRONTEND_URL` - Frontend URL for OAuth redirect (default: http://localhost:3001)
- `REDIS_HOST`, `REDIS_PORT` - Redis configuration (not yet integrated)

**Secrets location:**
- Stored in `.env` file (not committed to git)
- `.env.example` provides template with placeholder values

## Webhooks & Callbacks

**Incoming:**
- `GET /auth/google/callback` - Google OAuth callback endpoint
  - Handled by GoogleAuthGuard
  - User auto-created/updated on successful authentication

**Outgoing:**
- None detected - No outgoing webhooks implemented

## Data Models & ORM Integration

**TypeORM Entities:**
- `src/modules/users/user.entity.ts` - User profiles
  - Relations: Organized meetings, meeting participations
  - OAuth fields: `googleId`, `picture`

- `src/modules/meetings/entities/core/meeting.entity.ts` - Meeting core entity
  - LiveKit integration: `livekitRoomName` field for video conference linking
  - Status enum: SCHEDULED, ONGOING, COMPLETED, CANCELLED
  - Relations: Organizer, participants, events, transcripts, summaries, attachments

- Related entities for comprehensive meeting management:
  - `src/modules/meetings/entities/core/participant.entity.ts` - Meeting attendees
  - `src/modules/meetings/entities/collaboration/meeting-event.entity.ts` - Real-time events
  - `src/modules/meetings/entities/content/transcript-chunk.entity.ts` - AI transcript processing
  - `src/modules/meetings/entities/content/summary.entity.ts` - AI-generated summaries
  - Other entities for polls, Q&A, breakout rooms, notifications, etc.

## Request/Response Patterns

**Response Format:**
```json
{
  "data": { /* entity or list */ },
  "statusCode": 200,
  "message": "Operation successful"
}
```

**Error Response Format:**
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "BadRequest"
}
```

**Validation:**
- Global ValidationPipe enabled in `src/main.ts`
- Enforces: Whitelist properties, forbid unknown properties, auto-transform types
- DTOs use class-validator decorators

---

*Integration audit: 2026-03-22*
