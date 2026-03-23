# Architecture

**Analysis Date:** 2026-03-22

## Pattern Overview

**Overall:** Layered modular architecture with domain-driven separation

**Key Characteristics:**
- Module-based organization (Auth, Users, Meetings, Providers)
- Clear separation of concerns (Controllers → Services → Repositories → Entities)
- TypeORM as ORM with custom repositories
- NestJS dependency injection throughout
- Protected endpoints using JWT + Passport strategies
- External provider pattern for integrations (LiveKit, AI)

## Layers

**Presentation Layer (Controllers):**
- Purpose: Handle HTTP requests, route to services, validate input via DTOs
- Location: `src/modules/*/controllers/` and root `app.controller.ts`
- Contains: Controller classes with route decorators, request/response handling
- Depends on: Services, DTOs, Guards
- Used by: HTTP clients (frontend, external APIs)

**Service Layer (Services):**
- Purpose: Business logic, data orchestration, cross-service communication
- Location: `src/modules/*/services/`
- Contains: Injectable services with core application logic
- Depends on: Repositories, external providers (LiveKit, AI), other services
- Used by: Controllers, other services

**Data Access Layer (Repositories):**
- Purpose: Database query abstraction, repository pattern implementation
- Location: `src/modules/meetings/repositories/`
- Contains: Custom repository classes extending TypeORM Repository
- Depends on: TypeORM, entities
- Used by: Services

**Entity/Domain Layer (Entities):**
- Purpose: Database schema definitions, relationships, enums
- Location: `src/modules/*/entities/` - organized by subdomain (core, content, collaboration, scheduling, ai)
- Contains: TypeORM entities with decorators, relationship definitions, enums
- Depends on: TypeORM decorators, other entities
- Used by: Repositories, services

**Authentication Layer:**
- Purpose: JWT validation, OAuth strategy implementation
- Location: `src/modules/auth/`
- Contains: JwtStrategy, GoogleStrategy, JwtAuthGuard, AuthService
- Depends on: Passport.js, ConfigService
- Used by: Protected controllers via `@UseGuards(JwtAuthGuard)`

**Provider Layer (External Integrations):**
- Purpose: Encapsulate external service integrations
- Location: `src/providers/`
- Contains: LiveKitService (video conferencing), AiService (AI operations)
- Depends on: External SDKs, ConfigService
- Used by: Meetings service

## Data Flow

**Create Meeting Flow:**

1. Client sends POST `/meetings` with JWT token
2. MeetingsController receives request, applies JwtAuthGuard
3. Controller extracts userId from request, calls MeetingsService.create()
4. Service creates Meeting entity with status=scheduled
5. Service calls LiveKitService.createRoom() to provision video room
6. Service creates Participant record with organizer=true
7. Service returns created Meeting to controller
8. Controller returns Meeting object in HTTP response

**Join Meeting Flow:**

1. Client sends GET `/meetings/{id}/join` with JWT token
2. MeetingsController calls MeetingsService.joinMeeting()
3. Service validates meeting status (not completed/cancelled)
4. Service creates or retrieves Participant record
5. Service calls LiveKitService.generateToken() for video access
6. Service returns JoinResponseDto with meeting details and LiveKit token
7. Client uses token to connect to LiveKit room via WebRTC

**Participant Permission Model:**

- Organizer (isOrganizer=true): All permissions via MeetingPermission enum
- Regular Participant: Permissions assigned by organizer via participants array
- Permissions are JSON array in Participant entity (JSONB column in PostgreSQL)

**State Management:**

- Meeting status: SCHEDULED → ONGOING → COMPLETED (or CANCELLED from any state)
- Participant status: tracked via isInMeeting boolean
- No real-time state store - all state persisted to PostgreSQL
- LiveKit provides real-time participant tracking during video session

## Key Abstractions

**Meeting Aggregate:**
- Purpose: Central domain entity representing a meeting and its related data
- Examples: `src/modules/meetings/entities/core/meeting.entity.ts`
- Pattern: Aggregate root with cascading relationships
- Contains: Title, description, status, timestamps, organizer reference
- Related entities: Participant, MeetingEvent, MeetingQuestion, MeetingPoll, Summary, Attachment, TranscriptChunk, etc.

**Repository Pattern:**
- Purpose: Abstract database queries from service logic
- Examples: `src/modules/meetings/repositories/meeting.repository.ts`, `participant.repository.ts`
- Pattern: Custom classes extending TypeORM Repository
- Methods: findById(), findAllForUser(), create(), save(), remove()
- Benefits: Testable, composable queries, relationship eager-loading

**Service-to-Provider Pattern:**
- Purpose: Isolate external integrations from business logic
- Examples: LiveKitService, AiService
- Pattern: Injectable providers exported from modules
- Design: Configurable via ConfigService, error handling internal
- Integration: Services inject providers and call methods

**DTO (Data Transfer Object):**
- Purpose: Validate and transform incoming/outgoing data
- Examples: `src/modules/meetings/dto/create-meeting.dto.ts`
- Pattern: Classes with class-validator decorators
- Applied: GlobalValidationPipe in main.ts enforces validation
- Benefits: Type safety, auto-conversion (transform: true)

## Entry Points

**Bootstrap Entry:**
- Location: `src/main.ts`
- Triggers: npm start / npm run start:dev
- Responsibilities: App factory, CORS setup, global validation pipe, server listen

**App Module Entry:**
- Location: `src/app.module.ts`
- Triggers: NestFactory.create() in main.ts
- Responsibilities: Import all modules, configure TypeORM, configure ConfigModule

**Auth Entry:**
- Location: `src/modules/auth/auth.controller.ts`
- Routes: GET /auth/google, GET /auth/google/callback, GET /auth/verify
- Triggers: User login flow
- Responsibilities: OAuth redirect, token generation, token verification

**Meetings Entry:**
- Location: `src/modules/meetings/controllers/meetings.controller.ts`
- Routes: GET/POST/PUT/DELETE /meetings, GET /meetings/:id/join
- Triggers: Meeting lifecycle operations
- Responsibilities: CRUD operations, join meeting, access control

## Error Handling

**Strategy:** NestJS built-in exceptions mapped to HTTP status codes

**Patterns:**
- NotFoundException (404): Resource not found
- BadRequestException (400): Invalid input or state transition
- ForbiddenException (403): Permission denied
- UnauthorizedException (401): Auth failure or inactive user
- Thrown in: Services, guards, strategies
- Caught by: NestJS error filter (default), returns JSON response with statusCode, message, error

**Error Response Format:**
```json
{
  "statusCode": 400,
  "message": "Cannot join a completed or cancelled meeting",
  "error": "BadRequest"
}
```

## Cross-Cutting Concerns

**Logging:**
- Approach: Logger class from @nestjs/common
- Usage: LiveKitService uses private logger for room operations, error tracking
- Format: Console output in development, can be piped to external services

**Validation:**
- Approach: GlobalValidationPipe with class-validator decorators
- Configuration: whitelist=true (strip unknown properties), forbidNonWhitelisted=true, transform=true
- Applied: All DTOs in request body
- Failure: BadRequestException with validation errors

**Authentication:**
- Approach: JWT with Bearer token extraction
- Strategy: JwtStrategy validates token, retrieves user from database
- Guard: JwtAuthGuard on protected routes
- Token Generation: AuthService.generateToken() creates JWT with sub (user ID) and email
- Token Payload: { sub: userId, email: userEmail }

**Authorization:**
- Approach: Role-based via isOrganizer flag and MeetingPermission enum
- Implementation: Checked in services (e.g., MeetingsService.update validates organizer)
- Granular Permissions: EDIT_SUMMARY, CHAT_WITH_AI, UPDATE_PERMISSIONS, VIEW_TRANSCRIPT, DOWNLOAD_RECORDING, EDIT_MEETING_INFO

**Database Transactions:**
- Approach: Implicit TypeORM transactions for related operations
- Example: MeetingsService.create() creates Meeting, calls LiveKit, creates Participant as atomic unit
- Error Handling: Rollback on error (meeting removed if LiveKit room creation fails)

**CORS:**
- Approach: app.enableCors() in main.ts
- Configuration: origin=CORS_ORIGIN env var (default localhost:3001)
- Purpose: Allow frontend to make requests from different origin

---

*Architecture analysis: 2026-03-22*
