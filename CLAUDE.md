# MeetMind - Claude Development Guide

## Project Overview

**MeetMind** is an intelligent meeting management platform built with NestJS, TypeORM, and PostgreSQL. It enables users to organize, participate in, and analyze meetings with AI-powered insights, real-time collaboration features, and comprehensive meeting analytics.

## Technology Stack

### Backend
- **Framework**: NestJS 11.x - Progressive Node.js framework with TypeScript
- **Database**: PostgreSQL with TypeORM (0.3.x) - ORM for database operations
- **Authentication**:
  - JWT (JSON Web Tokens) with `@nestjs/jwt`
  - Google OAuth 2.0 with `passport-google-oauth20`
  - Passport.js strategies
- **Video/Real-time**: LiveKit SDK (2.15.x) - Video conferencing and real-time features
- **API**: Express with CORS enabled
- **Validation**: class-validator and class-transformer
- **Security**: bcrypt for password hashing
- **HTTP Client**: Axios for external API calls

### Development Tools
- **TypeScript** 5.7.x for type safety
- **Jest** 30.x for unit and e2e testing
- **ESLint** 9.x with Prettier integration for code quality
- **Testing**: Supertest for API testing

## Project Architecture

```
backend/src/
├── modules/
│   ├── auth/              # Authentication & authorization
│   │   ├── strategies/    # JWT and Google OAuth strategies
│   │   ├── guards/        # Auth guards
│   │   ├── dto/           # DTOs for auth requests/responses
│   │   └── auth.service.ts
│   │
│   ├── users/             # User management
│   │   ├── dto/           # User DTOs
│   │   ├── user.entity.ts
│   │   └── users.service.ts
│   │
│   └── meetings/          # Core meeting features
│       ├── controllers/   # API endpoints for each entity
│       ├── services/      # Business logic
│       ├── repositories/  # Data access layer
│       ├── entities/      # Database models
│       ├── dto/           # Request/response DTOs
│       └── meetings.module.ts
│
├── providers/
│   ├── livekit/          # Video conferencing integration
│   └── ai/               # AI services (summaries, transcriptions, etc.)
│
├── common/               # Shared utilities, decorators, middleware
├── config/               # Configuration management
├── database/             # Database setup and migrations
└── types/                # TypeScript types and interfaces
```

## Core Modules

### 1. **Users Module** (`src/modules/users/`)
- User profile management
- Google OAuth integration (auto-create/update users)
- User activation/deactivation
- Profile picture storage from OAuth providers

**Key Entity**: `User`
- UUID primary key
- Email (unique)
- First/Last name
- Google OAuth ID and profile picture URL
- Active status
- Timestamps (createdAt, updatedAt)
- Relations to meetings (organized meetings, participations)

### 2. **Auth Module** (`src/modules/auth/`)
Handles user authentication and authorization.

**Key Features**:
- Google OAuth flow with callback
- JWT token generation and verification
- Protected endpoints using JwtAuthGuard
- User context injection via request

**Endpoints**:
- `GET /auth/google` - Initiate Google login
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/verify` - Verify JWT token and get user info

### 3. **Meetings Module** (`src/modules/meetings/`)
Comprehensive meeting management with 8+ sub-entities.

**Core Entities**:
- **Meeting**: Main meeting entity with status (scheduled/ongoing/completed/cancelled)
  - Organizer (user who created it)
  - Start/end times
  - Duration tracking
  - LiveKit room name for video
  - Recording URL

- **MeetingParticipant**: Users attending the meeting

- **MeetingAgenda**: Agenda items for structured discussions

- **MeetingEvent**: Real-time events during meetings (speaker changes, agenda jumps, etc.)

- **QAQuestion**: Q&A pairs for meeting discussions

- **MeetingPoll**: Polls conducted during meetings

- **Transcript & TranscriptChunk**: Meeting transcripts with chunking for AI processing

- **MeetingSummary**: AI-generated or manual summaries of meetings

- **MeetingAttachment**: Files attached to meetings

- **MeetingActionItem**: Follow-up tasks from meetings

**Architecture Pattern**:
- Controllers handle HTTP endpoints
- Services contain business logic
- Repositories provide data access
- DTOs validate incoming requests
- Entities define database schema

### 4. **LiveKit Provider** (`src/providers/livekit/`)
Integration with LiveKit for real-time video conferencing and collaboration.

### 5. **AI Provider** (`src/providers/ai/`)
AI services for:
- Meeting transcription processing
- Summary generation
- Key point extraction
- Action item identification

## Database Schema

### Key Relationships
```
User (1) ──→ (N) Meeting (organizes)
User (N) ──→ (N) Meeting (participates via MeetingParticipant)
Meeting (1) ──→ (N) MeetingAgenda
Meeting (1) ──→ (N) MeetingParticipant
Meeting (1) ──→ (N) QAQuestion
Meeting (1) ──→ (N) MeetingPoll
Meeting (1) ──→ (1) Transcript
Meeting (1) ──→ (N) MeetingSummary
Meeting (1) ──→ (N) MeetingAttachment
Meeting (1) ──→ (N) MeetingActionItem
Meeting (1) ──→ (N) MeetingEvent
Transcript (1) ──→ (N) TranscriptChunk
```

### Meeting Status Flow
```
scheduled → ongoing → completed
         ↘          ↗
           cancelled (from any state)
```

## Environment Configuration

**Required Environment Variables** (`.env`):
```
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=meetmind_user
DB_PASSWORD=password
DB_NAME=meetmind

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3001

# Frontend
FRONTEND_URL=http://localhost:3001

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=7d

# LiveKit (optional)
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=your_livekit_server_url

# AI Services (optional)
AI_API_KEY=your_ai_api_key
```

## API Response Patterns

### Success Response
```json
{
  "data": { /* entity or list */ },
  "statusCode": 200,
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "BadRequest"
}
```

## Key Development Guidelines

### 1. **Code Organization**
- Keep controllers lean - only HTTP concerns
- Put business logic in services
- Use repositories for all database operations
- DTOs validate and transform data at API boundaries

### 2. **Database Migrations**
- TypeORM `synchronize: true` in development
- For production: use migrations (`synchronize: false`)
- Always add timestamps to entities (createdAt, updatedAt)

### 3. **Authentication**
- Use `JwtAuthGuard` for protected routes
- User context available via `@Request() req` decorator
- Google OAuth auto-creates/updates users on first login

### 4. **Error Handling**
- Throw `NotFoundException` for missing resources
- Throw `BadRequestException` for invalid input
- Throw `UnauthorizedException` for auth failures
- Let NestJS handle HTTP status mapping

### 5. **Validation**
- Use class-validator decorators in DTOs
- Enable `ValidationPipe` globally (already done in main.ts)
- Set `transform: true` to auto-convert types

### 6. **Testing**
```bash
npm run test              # Run unit tests
npm run test:watch       # Watch mode
npm run test:cov         # Coverage report
npm run test:e2e         # E2E tests
```

## Common Development Tasks

### Add a New Endpoint
1. Create/update DTOs in `dto/` folder
2. Add handler method in controller
3. Implement logic in service
4. Use repository for database queries
5. Test with `npm run test`

### Add a New Entity
1. Create entity file in `entities/`
2. Add TypeORM decorators with relationships
3. Create repository extending `Repository<Entity>`
4. Register in module imports
5. Generate migration if needed

### Connect to Database
```bash
# Start PostgreSQL locally or update DB_* env vars
# TypeORM will auto-sync in development
npm run start:dev
```

### Format and Lint Code
```bash
npm run format    # Prettier
npm run lint      # ESLint with fixes
```

## Important Notes

- **CORS**: Enabled by default for localhost:3001, configurable via `CORS_ORIGIN`
- **Validation**: Global validation pipe strips unknown properties (whitelist: true)
- **Database**: PostgreSQL required. Ensure it's running before starting the app
- **JWT**: Tokens are validated on protected routes. Check token expiry in `.env`
- **Google OAuth**: Must configure credentials in Google Cloud Console
- **Cascading Deletes**: Many relationships have cascading deletes enabled for cleanup

## Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running
- Verify DB_* environment variables match your setup
- Check if database exists: `createdb meetmind`

### Google OAuth Not Working
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Ensure callback URL matches Google Cloud Console configuration
- Check `GOOGLE_CALLBACK_URL` matches backend URL

### Tests Failing
- Ensure test database is available or use in-memory DB
- Check `test/jest-e2e.json` configuration
- Run `npm run test:debug` for debugging

### Port Already in Use
- Change `PORT` env variable
- Or kill existing process: `lsof -i :3000`

## Frontend Integration

The backend serves a REST API. Frontend should:
1. Store JWT token from `/auth/google/callback` or login endpoint
2. Include `Authorization: Bearer <token>` header for protected routes
3. Handle CORS headers (already configured)
4. Parse response format (data, statusCode, message fields)

---

**Last Updated**: 2026-03-20
**Maintainer**: MeetMind Team
