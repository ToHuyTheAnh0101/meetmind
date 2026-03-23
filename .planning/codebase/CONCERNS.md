# Codebase Concerns

## Technical Debt

### 1. Inconsistent Error Logging
- **File**: `src/providers/ai/ai.service.ts`
- **Issue**: Uses `console.error()` instead of NestJS `Logger` like other services
- **Impact**: Error tracking and log aggregation inconsistency
- **Fix**: Replace `console.error()` with injected `Logger` service

### 2. Insufficient Error Handling in Meeting Creation with LiveKit
- **File**: `src/modules/meetings/services/meetings.service.ts:createMeeting()`
- **Issue**: Missing try-catch for LiveKit room creation; no fallback on failure
- **Impact**: Meeting creation could fail without graceful error handling
- **Fix**: Wrap LiveKit call with try-catch, provide user feedback

### 3. Missing Permission Validation on Multiple Endpoints
- **Files**: Several meeting controllers
- **Issue**: Some endpoints don't verify user owns/participates in meeting before returning data
- **Impact**: Unauthorized data access possible
- **Fix**: Add `@UseGuards(JwtAuthGuard)` and verify user authorization in services

### 4. Missing Cascade Deletes on Some Entities
- **File**: `src/modules/meetings/entities/meeting.entity.ts`
- **Issue**: MeetingAttachment and some nested relations missing `cascade: ['remove']`
- **Impact**: Orphaned database records when parent meeting deleted
- **Fix**: Add cascade configuration to all parent-child relationships

### 5. Unprotected Public Endpoint Leaking Data
- **File**: `src/modules/meetings/controllers/meetings.controller.ts`
- **Issue**: Listing all meetings endpoint lacks authentication on GET /meetings
- **Impact**: Anyone can enumerate all meetings and participants
- **Fix**: Add `@UseGuards(JwtAuthGuard)` to list endpoint

## Known Bugs

### 1. LiveKit Room Cleanup Partial Failures
- **File**: `src/providers/livekit/livekit.service.ts`
- **Issue**: When meeting ends, LiveKit room deletion may fail silently
- **Symptom**: Orphaned LiveKit rooms accumulate over time
- **Impact**: LiveKit storage/billing inefficiency
- **Reproducible**: End a meeting while participants still connecting

### 2. Race Condition in Concurrent Meeting Joins
- **File**: `src/modules/meetings/services/meeting-participants.service.ts`
- **Issue**: Two users clicking join simultaneously can create duplicate participant records
- **Symptom**: User appears twice in participant list
- **Fix**: Add unique constraint on (meeting_id, user_id) or handle in service

### 3. Missing DateTime Validation
- **File**: `src/modules/meetings/dto/create-meeting.dto.ts`
- **Issue**: No validation preventing startTime in the past
- **Symptom**: Can create meetings that already started
- **Fix**: Add `@IsAfter(new Date())` decorator to startTime

## Security Issues

### 1. API Key Exposure in Error Messages
- **File**: `src/providers/ai/ai.service.ts`
- **Issue**: Error responses may include Gemini API details
- **Impact**: Potential API key exposure if error messages logged/transmitted
- **Fix**: Sanitize error messages, log full details only internally

### 2. Insufficient Authorization Checks on Attachment Access
- **File**: `src/modules/meetings/services/meeting-attachments.service.ts`
- **Issue**: No verification that user participates in meeting before downloading attachment
- **Impact**: Users can download attachments from meetings they don't belong to
- **Fix**: Verify user in MeetingParticipant before allowing download

### 3. Missing Rate Limiting on AI Endpoints
- **File**: `src/modules/meetings/controllers/` (summary, transcript endpoints)
- **Issue**: No rate limiting on AI-powered endpoints
- **Impact**: Abuse potential; unexpected Gemini API costs
- **Fix**: Implement `@RateLimit()` guards with configurable limits

### 4. Unvalidated External URLs in Recording Links
- **File**: `src/modules/meetings/entities/meeting.entity.ts`
- **Issue**: Recording URL stored without validation; could point to malicious URLs
- **Impact**: Users could be redirected to phishing/malware sites
- **Fix**: Validate URL is from LiveKit domain or trusted sources

### 5. Unvalidated OAuth Profile Pictures
- **File**: `src/modules/users/services/users.service.ts`
- **Issue**: Google OAuth profile picture URL stored without validation
- **Impact**: Could render malicious images if Google service compromised
- **Fix**: Validate image URLs, consider hosting copies of profile pictures

## Performance Bottlenecks

### 1. Eager Loading of Nested Relations
- **File**: `src/modules/meetings/repositories/meetings.repository.ts`
- **Issue**: Queries load full meeting details with all nested relations by default
- **Impact**: Large memory footprint; slow list queries
- **Fix**: Use lazy relations or leftJoinAndSelect strategically

### 2. No Pagination on List Endpoints
- **File**: `src/modules/meetings/controllers/meetings.controller.ts`
- **Issue**: `/meetings` and `/users/:id/meetings` return all results
- **Impact**: Poor performance with thousands of meetings/users
- **Fix**: Implement pagination (limit/offset or cursor-based)

### 3. Inefficient Transcript Processing
- **File**: `src/modules/meetings/services/transcripts.service.ts`
- **Issue**: Processes entire transcript in memory; no chunking strategy
- **Impact**: Memory issues with long meetings
- **Mitigation**: TranscriptChunk entity exists but not fully utilized

### 4. Missing Database Indexes
- **File**: Database schema
- **Issue**: No indexes on frequently queried columns (meeting.organizerId, participant.userId)
- **Impact**: Slow queries as data grows
- **Fix**: Add indexes on foreign keys and date range queries

## Fragile Areas

### 1. AI Service Exception Handling Fragility
- **File**: `src/providers/ai/ai.service.ts`
- **Issue**: Generic try-catch; doesn't handle specific Gemini API errors (rate limits, authentication)
- **Impact**: Users see generic "failed to generate" without clear reason
- **Fix**: Implement specific error handling for common failure modes

### 2. Cascading Delete Risks
- **File**: `src/modules/meetings/entities/`
- **Issue**: Multiple cascade configurations could cause unintended data loss
- **Impact**: Deleting meeting could cascade delete unintended related data
- **Risk Area**: Meeting → (MeetingParticipant → User?) unclear if User should delete

### 3. LiveKit Integration Failure Modes
- **File**: `src/providers/livekit/livekit.service.ts`
- **Issue**: No handling for:
  - LiveKit service being down
  - Network timeout on room creation
  - Invalid API credentials at runtime
- **Impact**: Meeting creation hangs or fails unexpectedly
- **Fix**: Add timeouts, circuit breaker pattern, fallback strategies

### 4. Incomplete Permission Enforcement
- **Files**: Multiple controllers and services
- **Issue**: Some endpoints check authentication but not authorization (user's role/permissions)
- **Impact**: Auth guard alone insufficient; need role-based access control
- **Recommendation**: Implement RBAC (admin, moderator, participant roles)

## Scaling Limits

### 1. Database Connection Pool Configuration
- **Issue**: Connection pool size not explicitly configured
- **Impact**: Under high load, connection exhaustion possible
- **Fix**: Set `max` in TypeORM connection options based on expected concurrency

### 2. LiveKit Room Creation Bottleneck
- **Issue**: Room creation is synchronous; no queuing
- **Impact**: Many concurrent meeting start requests could timeout
- **Fix**: Implement queue-based room creation with background job

### 3. Gemini API Rate Limits Unmanaged
- **File**: `src/providers/ai/ai.service.ts`
- **Issue**: No queuing, retry logic, or rate limit tracking
- **Impact**: Burst requests fail; no graceful degradation
- **Fix**: Implement request queuing with exponential backoff

### 4. Transcript Storage Strategy Missing
- **File**: `src/modules/meetings/entities/transcript.entity.ts`
- **Issue**: No clear strategy for storing/retrieving large transcripts
- **Impact**: Database bloat with long-meeting transcripts
- **Recommendation**: Consider external storage (S3) for transcripts >1MB

## Dependencies at Risk

### 1. Axios Outdated
- **Package**: `axios` (current: unknown from package.json)
- **Risk**: Known vulnerabilities in older versions
- **Action**: Run `npm audit` and update to latest patch version

### 2. Gemini API Non-Pinned Version
- **Package**: Gemini API client
- **Issue**: If using `latest` tag, breaking changes could occur
- **Fix**: Pin to specific version in package.json

### 3. TypeORM 0.3.28 (or similar)
- **Issue**: Version 0.3.x is older; 1.x available
- **Risk**: Missing security patches, newer features
- **Consideration**: Evaluate migration to TypeORM 1.x (may have breaking changes)

## Test Coverage Gaps

### 1. No AI Service Tests
- **File**: `src/providers/ai/ai.service.ts`
- **Gap**: Zero test coverage for Gemini integration
- **Impact**: No confidence in AI feature reliability
- **Fix**: Add unit tests with mocked Gemini API

### 2. No Permission Enforcement Tests
- **Gap**: Authorization logic untested
- **Impact**: Security issues not caught during development
- **Fix**: Add tests for unauthorized access attempts

### 3. No Concurrent Meeting Flow Tests
- **Gap**: Race condition with concurrent joins not tested
- **Impact**: Bug not caught until production
- **Fix**: Add e2e tests with simulated concurrent users

### 4. No LiveKit Integration Tests
- **Gap**: LiveKit provider not tested
- **Impact**: LiveKit failures unknown until deployment
- **Fix**: Add integration tests with LiveKit test server

### 5. Minimal Test Coverage
- **Current**: Only 1 `.spec.ts` file in entire codebase
- **Standard**: 70-80% coverage expected
- **Action**: Establish testing strategy and add comprehensive coverage

### 6. No DTO Validation Tests
- **Gap**: class-validator decorators not tested
- **Impact**: Invalid data might pass validation unexpectedly
- **Fix**: Add tests for all DTO edge cases

## Recommendations by Priority

### Critical (Security/Data Loss)
1. Add permission validation on all endpoints
2. Add unique constraint on MeetingParticipant (meeting_id, user_id)
3. Validate URLs and OAuth profile pictures
4. Add rate limiting on AI endpoints

### High (Stability/Reliability)
1. Add error handling for LiveKit failures
2. Implement proper AI service exception handling
3. Add cascade configurations
4. Fix concurrent join race condition

### Medium (Performance/Scale)
1. Add pagination to list endpoints
2. Add database indexes
3. Implement AI request queuing
4. Optimize query eager loading

### Low (Technical Debt)
1. Add comprehensive test coverage
2. Standardize logging (replace console.* with Logger)
3. Implement RBAC if role-based features planned
4. Evaluate TypeORM 1.x migration
