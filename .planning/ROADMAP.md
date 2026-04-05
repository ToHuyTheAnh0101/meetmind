# Roadmap: MeetMind Frontend

## Milestone 1: v1 — Calendar Dashboard

**Goal:** Users can log in with Google and immediately see all their meetings on a monthly calendar with status-colored dots and hover cards with meeting details.

**Success criteria:**
- A user with no account can visit the app, click "Sign in with Google", complete OAuth, and land on the calendar dashboard — all without error
- Calendar days with meetings display colored dots; days without meetings are clean
- Hovering a day with meetings reveals a card listing every meeting for that day with title, time range, and a color-and-text status badge
- Refreshing the page keeps the user logged in; an expired token redirects cleanly to the login page
- API errors and loading states are visible and user-friendly, never blank or broken

---

### Phase 1: Project Foundation and Auth

**Goal:** A working Vite + React project where users can authenticate via Google OAuth and reach a protected dashboard route.

**Scope:**
- SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05, SETUP-06
- AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06

**Plans:**
- [x] 01-01-PLAN.md — Scaffold and configure — Vite react-ts project on port 3001 with Tailwind, shadcn/ui, TanStack Query, React Router, and Axios configured
- [ ] 01-02-PLAN.md — Auth flow — Login page, `/auth/callback` token handler, AuthContext with three-state status, ProtectedRoute, and global 401 interceptor

**Success criteria:**
- [ ] `npm run dev` starts the app on `localhost:3001` with no errors
- [ ] Clicking "Sign in with Google" redirects to the backend OAuth flow and returns the user to `/auth/callback` with a stored JWT
- [ ] Refreshing any protected route with a valid token keeps the user on the page; with no token or an expired token, the user is redirected to `/login`
- [ ] The JWT does not appear in browser history after the OAuth callback completes
- [ ] A 401 response from any API call clears the token and redirects to `/login` exactly once

**Dependencies:** None — this is the starting point.

---

### Phase 2: Calendar Dashboard

**Goal:** Authenticated users land on a monthly calendar that fetches their meetings and shows status-colored dots and hover cards with meeting details.

**Scope:**
- CAL-01, CAL-02, CAL-03, CAL-04, CAL-05
- HOVER-01, HOVER-02, HOVER-03, HOVER-04, HOVER-05, HOVER-06
- DATA-01, DATA-02, DATA-03, DATA-04

**Plans:**
1. Calendar and data layer — `GET /meetings` via TanStack Query, date-keyed meeting index, monthly calendar view with month navigation, and dot indicators with priority-color logic
2. Hover card — Radix HoverCard showing all meetings for a hovered day with title, time range, and color-and-text status badge; skeleton loader during fetch; user-friendly error state on API failure

**Success criteria:**
- [ ] After login, the dashboard shows the current month with navigation arrows for previous and next months
- [ ] Days that have meetings display a dot whose color reflects the highest-priority status on that day (ongoing green, scheduled blue, completed gray, cancelled red); days without meetings show no dot
- [ ] Hovering a day with meetings shows a card after a brief delay listing all meetings for that day, each with title, start–end time, and a labeled status badge
- [ ] Hovering a day with no meetings shows nothing
- [ ] The hover card does not get clipped by the calendar and stays within the viewport
- [ ] A skeleton or spinner is visible while meetings load; a user-readable error message appears if the fetch fails

**Dependencies:** Phase 1 complete — a valid JWT must be available before any `/meetings` call can succeed.

---

### Phase 3: Polish and Resilience

**Goal:** The app handles unexpected conditions gracefully and meets baseline accessibility standards, making it ready for daily use.

**Scope:**
- DATA-03 (error state — addressed at the component level in Phase 2, hardened here with boundaries)

> Note: All 25 v1 requirements are covered in Phases 1 and 2. Phase 3 addresses production-hardening concerns (error boundaries, accessibility, env config) that do not correspond to discrete requirements but are implicit quality gates before the milestone is considered done.

**Plans:**
1. Error boundaries and production config — route-level ErrorBoundary, `.env.example` with documented variables, production build verification

**Success criteria:**
- [ ] A JavaScript error inside the calendar or hover card is caught by an ErrorBoundary and shows a fallback UI instead of a blank screen
- [ ] Status badges use both color and text (never color alone), confirmed by checking with a color-blindness simulator or by reading the DOM
- [ ] `npm run build` completes without TypeScript or lint errors
- [ ] `.env.example` documents all required `VITE_*` variables

**Dependencies:** Phase 2 complete — error boundaries and accessibility are validated against working features.

---

## Coverage

| Requirement | Phase |
|-------------|-------|
| SETUP-01 | Phase 1 |
| SETUP-02 | Phase 1 |
| SETUP-03 | Phase 1 |
| SETUP-04 | Phase 1 |
| SETUP-05 | Phase 1 |
| SETUP-06 | Phase 1 |
| AUTH-01 | Phase 1 |
| AUTH-02 | Phase 1 |
| AUTH-03 | Phase 1 |
| AUTH-04 | Phase 1 |
| AUTH-05 | Phase 1 |
| AUTH-06 | Phase 1 |
| CAL-01 | Phase 2 |
| CAL-02 | Phase 2 |
| CAL-03 | Phase 2 |
| CAL-04 | Phase 2 |
| CAL-05 | Phase 2 |
| HOVER-01 | Phase 2 |
| HOVER-02 | Phase 2 |
| HOVER-03 | Phase 2 |
| HOVER-04 | Phase 2 |
| HOVER-05 | Phase 2 |
| HOVER-06 | Phase 2 |
| DATA-01 | Phase 2 |
| DATA-02 | Phase 2 |
| DATA-03 | Phase 2 |
| DATA-04 | Phase 2 |

---
*Roadmap created: 2026-03-23*
*Requirements coverage: 25/25 v1 requirements mapped*
