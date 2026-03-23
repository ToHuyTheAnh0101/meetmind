# Directory Structure & Organization

## Project Root Layout

```
meetmind/
├── backend/                    # NestJS backend application
│   ├── src/                    # TypeScript source code
│   ├── test/                   # E2E test files
│   ├── dist/                   # Compiled JavaScript output
│   ├── node_modules/           # Dependencies
│   ├── package.json            # Backend dependencies
│   ├── tsconfig.json           # TypeScript configuration
│   ├── jest.config.js          # Jest test configuration
│   ├── .env.example            # Environment variables template
│   └── README.md               # Backend documentation
│
├── .planning/                  # GSD workflow planning directory
│   └── codebase/               # Codebase mapping documents
│
├── .claude/                    # Claude Code configuration
│   └── get-shit-done/          # GSD workflow files
│
├── CLAUDE.md                   # Project instructions & guidelines
└── README.md                   # Project overview
```

## Backend Source Structure (`backend/src/`)

### Root Level

```
backend/src/
├── main.ts                     # Application entry point, global setup
├── app.module.ts               # Root NestJS module, imports all feature modules
├── app.controller.ts           # Health check & basic routes
├── app.controller.spec.ts      # App controller tests
├── app.service.ts              # App-level service
│
├── modules/                    # Feature modules (organized by domain)
├── providers/                  # Infrastructure providers
├── common/                     # Shared utilities & cross-cutting concerns
├── config/                     # Configuration management
├── database/                   # Database setup & migrations
└── types/                      # Global TypeScript types & interfaces
```

## Modules Organization

### 1. Authentication Module (`modules/auth/`)

Controls user authentication and authorization.

```
auth/
├── auth.module.ts              # Module definition, imports Passport
├── auth.service.ts             # Auth logic (login, token generation)
├── auth.controller.ts          # HTTP endpoints (/auth/google, /auth/verify)
│
├── strategies/                 # Passport strategies
│   ├── jwt.strategy.ts         # JWT token validation strategy
│   └── google.strategy.ts      # Google OAuth 2.0 strategy
│
├── guards/                     # NestJS guards for protecting routes
│   ├── jwt-auth.guard.ts       # @UseGuards(JwtAuthGuard) on protected routes
│   └── google-auth.guard.ts    # Google OAuth authentication guard
│
└── dto/                        # Data Transfer Objects for type safety
    ├── login.dto.ts            # User login request
    ├── register.dto.ts         # User registration request
    └── auth-response.dto.ts    # Login response with JWT token
```

**Key Pattern**: Passport.js integration with JWT + Google OAuth
**Guard Usage**: `@UseGuards(JwtAuthGuard)` on protected endpoints
**Entry Points**:
- `GET /auth/google` - Initiates OAuth flow
- `GET /auth/google/callback` - OAuth callback, returns JWT
- `GET /auth/verify` - Verify current token

### 2. Users Module (`modules/users/`)

User profile and account management.

```
users/
├── users.module.ts             # Module definition
├── users.service.ts            # User CRUD, profile updates
├── users.controller.ts         # HTTP endpoints (/users/me, /users/:id)
├── user.entity.ts              # User database entity
│
└── dto/                        # DTOs
    └── user-profile.dto.ts     # User profile response format
```

**Key Entity**: `User`
- UUID primary key
- Email (unique)
- firstName, lastName
- googleId, picture (from OAuth)
- active (boolean)
- createdAt, updatedAt

**Key Pattern**: Auto-sync with Google OAuth (Passport creates/updates users)

### 3. Meetings Module (`modules/meetings/`)

Core meeting management with 8+ sub-entities.

```
meetings/
├── meetings.module.ts          # Module definition
│
├── controllers/                # HTTP endpoint handlers (one per entity type)
│   ├── meetings.controller.ts       # Meeting CRUD, list, join
│   ├── attachment.controller.ts     # File attachment endpoints
│   ├── event.controller.ts          # Real-time event tracking
│   ├── poll.controller.ts           # Meeting polls
│   ├── question.controller.ts       # Q&A questions
│   ├── summary.controller.ts        # Meeting summaries (AI-generated)
│   └── summary-template.controller.ts # Custom summary templates
│
├── services/                   # Business logic (one per entity)
│   ├── meetings.service.ts          # Meeting creation, updates, status
│   ├── attachment.service.ts        # File handling
│   ├── event.service.ts             # Event recording during meetings
│   ├── poll.service.ts              # Poll creation and voting
│   ├── question.service.ts          # Q&A management
│   ├── summary.service.ts           # Summary generation & retrieval
│   └── summary-template.service.ts  # Template management
│
├── repositories/               # Data access layer (one per entity)
│   ├── meeting.repository.ts        # Meeting queries
│   ├── attachment.repository.ts
│   ├── event.repository.ts
│   ├── participant.repository.ts    # MeetingParticipant queries
│   ├── poll.repository.ts
│   ├── question.repository.ts
│   ├── summary.repository.ts
│   └── summary-template.repository.ts
│
├── entities/                   # Database entity definitions
│   ├── core/
│   │   ├── meeting.entity.ts        # Main meeting entity
│   │   └── participant.entity.ts    # User participation in meeting
│   │
│   ├── collaboration/          # Real-time collaboration entities
│   │   ├── meeting-event.entity.ts  # Events during meeting (speaker change, etc.)
│   │   ├── meeting-poll.entity.ts   # Polls in meeting
│   │   ├── meeting-question.entity.ts # Q&A questions
│   │   ├── meeting-answer.entity.ts # Answers to questions
│   │   ├── breakout-room.entity.ts  # Breakout session rooms
│   │   └── breakout-room-participant.entity.ts
│   │
│   ├── content/                # Content & summaries
│   │   ├── summary.entity.ts        # AI-generated summaries
│   │   ├── summary-template.entity.ts # Custom summary formats
│   │   ├── attachment.entity.ts     # File attachments
│   │   └── transcript-chunk.entity.ts # Transcript with chunking
│   │
│   ├── scheduling/             # Scheduling & access control
│   │   ├── access-request.entity.ts # Meeting access requests
│   │   └── notification.entity.ts   # Meeting notifications
│   │
│   ├── ai/                     # AI integration
│   │   └── chat-history.entity.ts   # AI chat conversation history
│   │
│   └── index.ts                # Entity barrel export
│
└── dto/                        # Data Transfer Objects (request/response)
    ├── create-meeting.dto.ts
    ├── update-meeting.dto.ts
    ├── create-attachment.dto.ts
    ├── create-event.dto.ts
    ├── create-poll.dto.ts
    ├── create-question.dto.ts
    ├── answer-question.dto.ts
    ├── create-summary.dto.ts
    ├── update-summary.dto.ts
    ├── create-summary-template.dto.ts
    ├── update-summary-template.dto.ts
    └── join-response.dto.ts
```

**Entity Relationships**:
```
Meeting (1) ──→ (N) MeetingParticipant
         ├──→ (N) MeetingEvent
         ├──→ (N) MeetingPoll
         ├──→ (N) MeetingQuestion
         ├──→ (N) Attachment
         ├──→ (N) Summary
         ├──→ (1) SummaryTemplate
         ├──→ (N) BreakoutRoom
         └──→ (1) Transcript
              └──→ (N) TranscriptChunk
```

**Meeting Status Flow**: `scheduled` → `ongoing` → `completed` (or `cancelled` from any)

**Key Patterns**:
- Repository pattern for data access
- Service encapsulates business logic
- Controllers are thin HTTP handlers
- DTOs validate and transform data at API boundary

## Providers (`src/providers/`)

Infrastructure and third-party integrations.

```
providers/
├── livekit/                    # Video conferencing
│   ├── livekit.module.ts
│   └── livekit.service.ts      # Room creation, token generation, cleanup
│
└── ai/                         # AI services
    ├── ai.module.ts
    └── ai.service.ts           # Gemini integration for summaries, transcription
```

## Common & Shared (`src/common/`)

Utilities, decorators, middleware used across modules.

```
common/
├── decorators/                 # Custom decorators
├── middleware/                 # Express middleware
├── interceptors/               # NestJS interceptors
├── filters/                    # Exception filters
└── utils/                      # Helper functions
```

## Configuration (`src/config/`)

Environment and application configuration.

```
config/
├── database.config.ts          # TypeORM connection setup
├── env.config.ts               # Environment variable validation
└── constants.ts                # Application constants
```

## Database (`src/database/`)

Database migrations and initialization.

```
database/
├── migrations/                 # TypeORM migration files
└── seeds/                      # Optional: database seeding scripts
```

## File Naming Conventions

### Entity Files
- **Pattern**: `entity-name.entity.ts`
- **Example**: `meeting.entity.ts`, `user.entity.ts`
- **Location**: `modules/{moduleName}/entities/`

### Service Files
- **Pattern**: `feature.service.ts`
- **Example**: `meetings.service.ts`, `auth.service.ts`
- **Location**: `modules/{moduleName}/services/`

### Controller Files
- **Pattern**: `entity-name.controller.ts` or `feature.controller.ts`
- **Example**: `meetings.controller.ts`, `users.controller.ts`
- **Location**: `modules/{moduleName}/controllers/`

### Repository Files
- **Pattern**: `entity-name.repository.ts`
- **Example**: `meeting.repository.ts`, `user.repository.ts`
- **Location**: `modules/{moduleName}/repositories/`

### DTO Files
- **Pattern**: `verb-entity.dto.ts` (e.g., create-meeting, update-user)
- **Example**: `create-meeting.dto.ts`, `user-profile.dto.ts`
- **Location**: `modules/{moduleName}/dto/`

### Test Files
- **Pattern**: `filename.spec.ts` (colocated with source)
- **Example**: `meetings.service.spec.ts`
- **Location**: Same directory as source file

### Guard Files
- **Pattern**: `feature-auth.guard.ts`
- **Example**: `jwt-auth.guard.ts`, `google-auth.guard.ts`
- **Location**: `modules/{moduleName}/guards/`

### Strategy Files
- **Pattern**: `provider.strategy.ts`
- **Example**: `google.strategy.ts`, `jwt.strategy.ts`
- **Location**: `modules/{moduleName}/strategies/`

## Key Locations

| Feature | Primary Location |
|---------|------------------|
| Authentication | `modules/auth/` |
| User management | `modules/users/` |
| Meeting CRUD | `modules/meetings/services/meetings.service.ts` |
| LiveKit integration | `providers/livekit/livekit.service.ts` |
| AI services | `providers/ai/ai.service.ts` |
| Database entities | `modules/meetings/entities/` |
| API endpoints | `modules/{moduleName}/controllers/` |
| Business logic | `modules/{moduleName}/services/` |
| Data access | `modules/{moduleName}/repositories/` |
| JWT validation | `modules/auth/strategies/jwt.strategy.ts` |
| Google OAuth | `modules/auth/strategies/google.strategy.ts` |

## Module Dependencies

```
app.module
├── auth.module
│   └── passport, JWT
├── users.module
│   └── user.entity, users.service
├── meetings.module
│   ├── 8+ entities (core, collaboration, content, etc.)
│   ├── 7 services (meetings, attachment, event, poll, question, summary, template)
│   ├── livekit.module (dependency)
│   └── ai.module (dependency)
├── livekit.module (providers)
└── ai.module (providers)
```

## Import Structure

**Barrel Exports**:
- `modules/meetings/entities/index.ts` - Exports all meeting entities
- Other modules use standard imports

**Module Imports**:
- Controllers → Services
- Services → Repositories
- Repositories → Entities
- Controllers use DTOs for validation
- Guards use Strategies for authentication

## Static Files & Assets

- **Environment**: `.env` (git-ignored, see `.env.example`)
- **Configuration**: `tsconfig.json`, `jest.config.js`
- **Documentation**: `CLAUDE.md` (development guidelines)

## Database Considerations

- **ORM**: TypeORM 0.3.x
- **Synchronize**: Enabled in development (`synchronize: true`)
- **Production**: Disabled, uses migrations (`synchronize: false`)
- **Connection**: PostgreSQL required
- **Transactions**: Can be configured at service level
