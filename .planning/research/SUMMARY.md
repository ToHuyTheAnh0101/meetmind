# Project Research Summary

**Project:** MeetMind Frontend v1
**Domain:** React SPA — meeting management dashboard with calendar UI
**Researched:** 2026-03-23
**Confidence:** HIGH

## Executive Summary

MeetMind v1 is a focused React SPA: a monthly calendar dashboard that connects to an existing NestJS backend via JWT-authenticated REST calls. The scope is deliberately narrow — Google OAuth login, one screen, meeting dots, and hover cards. Research confirms the technology choices are well-matched: Vite + React + TypeScript for scaffolding, react-big-calendar for the calendar primitive, shadcn/ui + Tailwind for the clean-minimal look, TanStack Query for server state, and Axios for authenticated HTTP. None of these are experimental choices — each is the current community standard for its concern, and they compose cleanly together.

The highest-consequence implementation decisions are in auth and calendar rendering, not UI. The backend delivers the JWT as a query param on the OAuth redirect (`/auth/callback?token=...`), confirmed from actual backend source code. This means localStorage is required for token storage — the frontend cannot use httpOnly cookies without backend changes that are out of scope. The auth callback route must extract the token synchronously, strip it from browser history immediately, and call `/auth/verify` before considering the user authenticated. The backend response envelope is inconsistently applied (raw arrays from meetings endpoints, not the documented `{ data, statusCode }` wrapper), so the API layer must unwrap per endpoint.

The main risks are: UTC/timezone mismatch causing meetings to appear on the wrong calendar day; hover cards being clipped by `overflow: hidden` ancestors (mitigated by Radix portal rendering); auth flicker if the initial auth state is `false` instead of `'loading'`; and the redirect-based OAuth flow requiring `window.location.href` navigation (not `fetch`). All pitfalls have well-understood mitigations — none require novel engineering.

## Key Findings

### Recommended Stack

The stack is conventional and low-risk. Vite (`react-ts` template) replaces the deprecated Create React App and provides fast HMR with TypeScript out of the box. react-big-calendar (MIT, ~13k stars) is the right calendar primitive: its `components.dateCellWrapper` and `components.event` slots make the dot-and-hover-card pattern trivial to inject without fighting the library. shadcn/ui ships a built-in `HoverCard` component backed by Radix UI's `@radix-ui/react-hover-card`, which handles viewport overflow, flip, and the mouse-to-card grace period automatically.

See `.planning/research/STACK.md` for full comparison tables.

**Core technologies:**
- **Vite + React + TypeScript:** Scaffolding — CRA is deprecated; Vite is the current standard
- **react-big-calendar + date-fns:** Calendar — MIT, custom slot injection, minimal styling surface
- **shadcn/ui + Tailwind CSS:** UI system — "clean minimal" is its design identity; HoverCard built in
- **TanStack Query v5:** Server state — caching, background refetch, loading/error states for REST APIs
- **React Context + `useAuth()`:** Auth state — one OAuth method, no login form, no store needed
- **Axios:** HTTP client — interceptors for JWT header injection and global 401 handling
- **React Router v6:** Routing — `/login`, `/auth/callback`, `/` (dashboard); v7 adds SSR complexity not needed

### Expected Features

**Must have (table stakes):**
- Google OAuth login — only auth method, backend already implements it
- `/auth/callback` route that reads `?token=` and calls `/auth/verify` before proceeding
- Monthly calendar view — single screen for v1
- Dot indicator on days with meetings — priority color when multiple statuses exist (ongoing > scheduled > completed > cancelled)
- Hover card on date showing all meetings for that day (title, time, status badge)
- Protected routes that redirect unauthenticated users to `/login`
- Logout that clears localStorage token

**Should have (quality-of-life):**
- Three-state auth status (`loading` / `authenticated` / `unauthenticated`) to prevent flicker
- Skeleton loader on calendar while fetching — empty calendar should not look like "no meetings"
- Status color legend or paired text labels (accessibility — never color alone)
- Token expiry detection on app bootstrap via `/auth/verify` 401
- Global 401 interceptor → `auth:logout` event → redirect to `/login`

**Defer (v2+):**
- httpOnly cookie upgrade for JWT storage (requires backend changes)
- Mobile touch fallback for hover cards (v1 is desktop-first)
- Windowed date-range fetching from backend (if all-meetings fetch becomes slow)
- Meeting detail page, agenda, action items, transcript views

### Architecture Approach

Feature-based folder layout (`features/auth/`, `features/meetings/`) with a shared `lib/` layer for the axios instance and token storage. The API layer is three tiers: `apiClient.ts` (axios instance with interceptors) → feature API modules (thin async functions, unwrap per endpoint) → TanStack Query hooks (data-fetching state consumed by components). Auth state lives in React Context; UI state (month navigation, hover open/close) stays local with `useState`. No global store (Zustand/Redux) is needed for v1 scope.

See `.planning/research/ARCHITECTURE.md` for the full file tree and code patterns.

**Major components:**
1. `AuthCallbackPage` — reads `?token=`, stores to localStorage, calls `/auth/verify`, navigates to dashboard
2. `ProtectedRoute` — blocks unauthenticated access; renders nothing while auth status is `'loading'`
3. `CalendarView` — react-big-calendar with custom day cell slot; builds date-keyed meeting map; `React.memo` on cells
4. `MeetingHoverCard` — Radix `HoverCard` rendering meeting list; portaled to `document.body`
5. `apiClient` — axios instance; request interceptor injects JWT; response interceptor handles 401 via DOM event
6. `AuthContext` — wraps app; listens for `auth:logout` event; drives navigation

### Critical Pitfalls

1. **Auth flicker** — initialize auth status as `'loading'`, not `false`. Render nothing (or a spinner) until `/auth/verify` resolves. If auth starts as `false`, the protected route redirects to `/login` before the check completes, causing a flash.

2. **JWT leaking in browser history** — immediately after reading `?token=` from the URL, call `navigate(route, { replace: true })` to strip it from history. Otherwise it appears in Referer headers on subsequent navigations.

3. **UTC/timezone mismatch on calendar** — meeting timestamps from the backend are UTC. Use `date-fns-tz` for timezone-aware date comparisons when grouping meetings by calendar day. Without this, meetings near midnight appear on the wrong day for UTC+ users.

4. **Hover card clipped by overflow ancestors** — react-big-calendar cells have `overflow: hidden` ancestors. The Radix `HoverCard` renders via portal to `document.body` automatically. Do not build a custom hover card — you will re-solve this problem.

5. **Multiple 401s triggering multiple logout redirects** — the axios interceptor should set a single-fire guard flag (`let isRedirecting = false`) so only the first 401 dispatches `auth:logout`. Subsequent 401s while the redirect is in flight are suppressed.

6. **SPA routes returning 404 on direct access** — configure `server.historyApiFallback: true` in Vite dev config. This is critical for `/auth/callback`, which is navigated to by a full browser redirect from the backend.

## Implications for Roadmap

Based on dependency order and research findings, three phases cover v1 completely.

### Phase 1: Project Foundation and Auth Flow

**Rationale:** Auth is the hard dependency for everything else. No API call can be made without a valid JWT in localStorage. The OAuth redirect callback is the trickiest piece — it must be correct before the calendar can be built. Scaffolding and auth together make a shippable "login → see something" baseline that can be demoed and tested against the real backend.

**Delivers:** Vite project with TypeScript, Tailwind, shadcn/ui, React Router; axios client with interceptors; AuthContext with three-state status; Login page; `/auth/callback` route; ProtectedRoute; logout.

**Features addressed:** Google OAuth login, JWT storage, token expiry detection, protected routing.

**Pitfalls to avoid:** Auth flicker (three-state status), JWT in browser history (replace navigation), multiple 401 redirects (single-fire guard), SPA 404 on callback URL (Vite historyApiFallback).

### Phase 2: Calendar Dashboard

**Rationale:** With auth working, the calendar can fetch meetings with a real token against the live backend. react-big-calendar integration, date-keyed meeting grouping, dot rendering, and hover card are the core product value. This phase is the entire user-visible feature set of v1.

**Delivers:** DashboardPage with react-big-calendar (month view); custom day cell slot with dot indicator; priority-color dot logic; MeetingHoverCard (Radix HoverCard, portaled); meeting list per day (title, time, status badge); skeleton loader while fetching; `useMeetings` TanStack Query hook; `meetingsApi.ts` unwrapping raw array from `/meetings`.

**Features addressed:** Monthly calendar, dot indicators, hover card, status colors, skeleton loading state.

**Pitfalls to avoid:** UTC timezone mismatch (date-fns-tz), hover card clipping (portal confirmed via Radix), calendar cell re-renders (React.memo + date-keyed map), empty-calendar-as-no-data confusion (skeleton loader).

### Phase 3: Polish and Error Resilience

**Rationale:** The first two phases deliver core functionality. Phase 3 makes it production-ready: error boundaries, error states, accessibility pairings (color + text), logout confirmation, and environment config for deployment. Low risk — all well-documented patterns.

**Delivers:** Route-level ErrorBoundary; TanStack Query `isError` states; API 400/404/500 toast messages; accessibility labels on status badges; `.env.example` with documented variables; production build verification.

**Features addressed:** Error handling, accessibility compliance, deployment readiness.

**Pitfalls to avoid:** Single null field crashing full page (ErrorBoundary), color-only status indicators (pair with text labels).

### Phase Ordering Rationale

- Phase 1 before Phase 2: auth is a hard runtime dependency — without a JWT, every API call fails with 401.
- Phase 2 before Phase 3: no point polishing error states before the happy path works end-to-end.
- No AI, video, or participant features are in scope — all backend modules beyond `/meetings` and `/auth` are deferred.
- Backend changes are out of scope for all three phases; the frontend adapts to the existing API contract.

### Research Flags

Phases with standard patterns (no additional research needed):
- **Phase 1:** React Router, Axios interceptors, React Context — thoroughly documented, no edge cases beyond those already captured in PITFALLS.md.
- **Phase 2:** react-big-calendar slot API is documented; Radix HoverCard positioning is solved by the library. TanStack Query patterns are standard.
- **Phase 3:** Error boundaries and toast patterns are standard React.

No phases require `/gsd:research-phase` — all decisions are resolved by this research round.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All libraries are current standards with strong community adoption; react-big-calendar + Radix HoverCard composition is a known pattern |
| Features | HIGH | Backend source code confirmed auth flow; response shapes confirmed from ARCHITECTURE research; no guesswork on API contracts |
| Architecture | HIGH | Backend code was read directly — auth redirect behavior, JWT payload shape, CORS port, response envelope inconsistency all confirmed from source |
| Pitfalls | HIGH | All pitfalls are documented failure modes with verified mitigations, not speculative risks |

**Overall confidence:** HIGH

### Gaps to Address

- **Date range query params:** The backend `/meetings` endpoint may not support `startDate`/`endDate` filtering. If the meeting list is large, fetching all meetings is wasteful. Validate during Phase 2 — if filtering is absent, client-side filtering is acceptable for v1; backend changes are a v2 concern.
- **CORS port lock:** Backend CORS is locked to `localhost:3001`. Frontend dev server must be configured to run on that exact port (`vite.config.ts` `server.port: 3001`). Confirm this is enforced in project setup docs before Phase 1 ends.
- **httpOnly cookie upgrade:** localStorage for JWT is acceptable for v1 but should be documented as a known security trade-off. Flag for v2 planning when backend changes are in scope.

## Sources

### Primary (HIGH confidence)
- Backend source code (`auth.controller.ts`, `meetings` module) — auth redirect behavior, JWT payload, CORS config, response envelope shapes
- Radix UI official docs (`@radix-ui/react-hover-card`) — portal behavior, open/close delays, Floating UI positioning
- TanStack Query v5 official docs — query key patterns, caching behavior
- Vite official docs — `historyApiFallback`, environment variable prefix rules (`VITE_`)

### Secondary (MEDIUM confidence)
- react-big-calendar GitHub README and examples — `dateCellWrapper` / `components.event` slot API
- shadcn/ui docs — HoverCard component, Tailwind integration
- date-fns-tz docs — timezone-aware date comparison patterns

### Tertiary (LOW confidence)
- Community patterns for single-fire 401 interceptor guard — common approach but not formally documented; validate during Phase 1 implementation

---
*Research completed: 2026-03-23*
*Ready for roadmap: yes*
