# Phase 1: Project Foundation and Auth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 01-project-foundation-and-auth
**Areas discussed:** Auth state management, Token storage strategy, Auth flow UX, UI component choices

---

## Auth State Management

| Option | Description | Selected |
|--------|-------------|----------|
| React Context API | React Context API with useAuth hook. Simple, built-in, no extra dependencies. Good for this scale. | ✓ |
| Zustand | Zustand store. Lightweight, no provider needed, easy to test. More modern state management. | |
| You decide | You decide — pick the best approach for this project's needs. | |

**User's choice:** React Context API

**Follow-up question:** How should we handle auth states on app load?

| Option | Description | Selected |
|--------|-------------|----------|
| Loading → verify → state | Start as loading, call /auth/verify on mount, then transition to authenticated or unauthenticated. Shows a brief loading state on first load. | ✓ |
| Optimistic UI + verify | Check localStorage first, show UI immediately, then verify in background. Faster perceived load but may show wrong state briefly. | |
| You decide | You decide — pick the best UX for this app. | |

**User's choice:** Loading → verify → state

**Notes:** User wants to prevent auth flicker by showing loading state first, then verifying token.

---

## Token Storage Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| localStorage | localStorage. Simple, persists across sessions, works with existing backend. Standard for v1. | ✓ |
| sessionStorage | sessionStorage. Clears on tab close, more secure but users must re-login each session. | |
| You decide | You decide — pick the best approach for v1. | |

**User's choice:** localStorage

**Follow-up question:** How should we handle token expiration?

| Option | Description | Selected |
|--------|-------------|----------|
| Check on app load | Decode JWT to check exp on app load. If expired, clear token and redirect to login. Simple and effective. | ✓ |
| Handle on 401 only | Use Axios interceptor to catch 401s, clear token, redirect. Handle expiry reactively when API calls fail. | |
| You decide | You decide — pick the best approach. | |

**User's choice:** Check on app load

**Notes:** User wants proactive token expiration checking on app load, not just reactive 401 handling.

---

## Auth Flow UX

| Option | Description | Selected |
|--------|-------------|----------|
| Loading spinner + error handling | Show loading spinner on /auth/callback while processing token. If error, show message with 'Try again' button. | ✓ |
| Minimal message + redirect | Show brief 'Signing in...' message, then redirect. Minimal UI, fast transition. | |
| You decide | You decide — pick the best UX. | |

**User's choice:** Loading spinner + error handling

**Notes:** User wants good UX during OAuth callback with loading state and error handling.

---

## UI Component Choices

| Option | Description | Selected |
|--------|-------------|----------|
| Card + Button | Card component with centered layout, Google Sign-in button inside. Clean, minimal, matches shadcn patterns. | ✓ |
| Minimal centered button | Simple centered layout with just the Google button. No card, very minimal. | |
| You decide | You decide — pick the best UI approach. | |

**User's choice:** Card + Button

**Notes:** User wants clean, minimal login page using shadcn Card and Button components.

---

## Claude's Discretion

None — user made all decisions explicitly.

---

## Deferred Ideas

None — discussion stayed within phase scope.

---

## Additional Context

**User clarification:** Production only allows Gmail login (Google OAuth) — no other registration methods. This aligns with existing backend implementation.
