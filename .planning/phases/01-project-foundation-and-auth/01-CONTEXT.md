# Phase 1: Project Foundation and Auth - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Create a working Vite + React project where users can authenticate via Google OAuth and reach a protected dashboard route. This includes scaffolding the project, configuring all foundational tooling, and implementing the complete authentication flow.

</domain>

<decisions>
## Implementation Decisions

### Auth State Management
- **D-01:** Use React Context API with useAuth hook for global auth state management
- **D-02:** Implement three-state auth status: loading / authenticated / unauthenticated
- **D-03:** On app load, start with loading state, call /auth/verify, then transition to authenticated or unauthenticated (prevents auth flicker)

### Token Storage Strategy
- **D-04:** Store JWT token in localStorage (key: meetmind_token)
- **D-05:** Decode JWT to check exp on app load; if expired, clear token and redirect to login
- **D-06:** Implement token storage utilities: getToken(), setToken(), clearToken(), isTokenExpired()

### Auth Flow UX
- **D-07:** On /auth/callback, show loading spinner while processing token
- **D-08:** If OAuth fails, show error message with "Try again" button
- **D-09:** Strip token from browser history via history.replaceState after storing it

### UI Component Choices
- **D-10:** Use shadcn/ui Card component for login page layout (centered, clean)
- **D-11:** Use shadcn/ui Button component for "Sign in with Google" action
- **D-12:** Minimal, clean design matching shadcn New York style

### Claude's Discretion
- Exact loading spinner design and animation
- Error message wording and styling
- Card padding, spacing, and shadow variants
- Button size and variant choices

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — All SETUP-01 to SETUP-06 and AUTH-01 to AUTH-06 requirements
- `.planning/REQUIREMENTS.md` §Project Setup — Vite, Tailwind, shadcn/ui, TanStack Query, React Router, Axios requirements
- `.planning/REQUIREMENTS.md` §Authentication — Google OAuth flow, token handling, auth states, protected routes

### Project Context
- `.planning/PROJECT.md` — Backend auth endpoints (/auth/google, /auth/google/callback, /auth/verify)
- `.planning/PROJECT.md` §Context — Frontend port 3001 constraint, JWT token format, backend response format
- `.planning/PROJECT.md` §Constraints — React (not Next.js), existing backend API, Google OAuth flow

### Backend Integration
- `CLAUDE.md` §Backend — NestJS backend structure, auth module, Google OAuth strategy
- `CLAUDE.md` §API Response Patterns — Backend response format {data, statusCode, message}
- `CLAUDE.md` §Environment Configuration — Required environment variables (VITE_API_URL, etc.)

### Codebase Patterns
- `.planning/codebase/CONVENTIONS.md` — TypeScript conventions, naming patterns, error handling
- `.planning/codebase/STRUCTURE.md` — Backend module structure, auth module organization
- `.planning/codebase/STACK.md` — Backend tech stack (NestJS, TypeORM, PostgreSQL, Passport)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Backend auth endpoints already implemented at `/auth/google`, `/auth/google/callback`, `/auth/verify`
- Backend returns JWT tokens with standard format
- Backend CORS configured for frontend on port 3001
- shadcn/ui components (Button, Card) will be available after initialization

### Established Patterns
- Backend uses NestJS with Passport.js for authentication
- Backend response format: `{ data: {...}, statusCode: 200, message: "..." }`
- Backend throws NestJS exceptions (NotFoundException, BadRequestException, UnauthorizedException)
- Backend uses UUID primary keys and timestamps (createdAt, updatedAt)

### Integration Points
- Frontend must call `GET /auth/google` to initiate OAuth flow
- Frontend must handle `/auth/callback?token=...` to receive JWT
- Frontend must call `GET /auth/verify` with `Authorization: Bearer <token>` to validate token
- Frontend must include `Authorization: Bearer <token>` header for all protected API calls
- Frontend must run on port 3001 (backend CORS whitelist)

</code_context>

<specifics>
## Specific Ideas

- Production only allows Gmail login (Google OAuth) — no other registration methods
- Clean, minimal UI design matching shadcn New York style
- No auth flicker on page load — show loading state first
- Token must not appear in browser history after OAuth callback

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---
*Phase: 01-project-foundation-and-auth*
*Context gathered: 2026-04-05*
