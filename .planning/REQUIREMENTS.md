# Requirements: MeetMind Frontend

**Defined:** 2026-03-23
**Core Value:** Users can see all their meetings at a glance and know the status of each one without navigating away from the dashboard.

## v1 Requirements

### Project Setup

- [ ] **SETUP-01**: React + TypeScript SPA scaffolded with Vite (`react-ts` template)
- [ ] **SETUP-02**: Project runs on `localhost:3001` (required by backend CORS config)
- [ ] **SETUP-03**: Tailwind CSS and shadcn/ui configured
- [ ] **SETUP-04**: TanStack Query v5 configured as data-fetching layer
- [ ] **SETUP-05**: React Router v6 configured with routes: `/login`, `/auth/callback`, `/` (dashboard)
- [ ] **SETUP-06**: Axios instance configured with base URL from `VITE_API_URL` env var and JWT interceptor

### Authentication

- [ ] **AUTH-01**: Login page displays "Sign in with Google" button that redirects to `VITE_API_URL + /auth/google`
- [ ] **AUTH-02**: `/auth/callback` route reads `?token=` from URL, stores JWT in localStorage, strips token from browser history via `history.replaceState`
- [ ] **AUTH-03**: On app bootstrap, existing token is validated by calling `/auth/verify`; if invalid or expired, user is redirected to `/login`
- [ ] **AUTH-04**: Auth state has three statuses: `loading` / `authenticated` / `unauthenticated` — no auth flicker on page load
- [ ] **AUTH-05**: Global Axios interceptor catches 401 responses, clears token, and dispatches `auth:logout` event that redirects to `/login`
- [ ] **AUTH-06**: `ProtectedRoute` component wraps authenticated routes; unauthenticated users are redirected to `/login`

### Calendar Dashboard

- [ ] **CAL-01**: After login, user lands on a monthly calendar view showing the current month
- [ ] **CAL-02**: User can navigate to previous and next months
- [ ] **CAL-03**: Days that have at least one meeting display a colored dot indicator below the date number
- [ ] **CAL-04**: Dot color reflects highest-priority meeting status on that day: ongoing (green) > scheduled (blue) > completed (gray) > cancelled (red)
- [ ] **CAL-05**: Days with no meetings show no indicator

### Hover Card

- [ ] **HOVER-01**: Hovering a date that has meetings shows a hover card after a 500ms delay
- [ ] **HOVER-02**: Hover card lists all meetings for that day, each showing: title, start time – end time, status badge
- [ ] **HOVER-03**: Status badge uses color + text label (not color alone) for accessibility
- [ ] **HOVER-04**: Hover card positions itself to avoid viewport overflow (uses Radix UI `HoverCard`)
- [ ] **HOVER-05**: Hover card remains open when cursor moves from date to card (300ms close grace period)
- [ ] **HOVER-06**: Hovering dates with no meetings shows no hover card

### Data & API

- [ ] **DATA-01**: Meetings are fetched from `GET /meetings` with JWT `Authorization: Bearer` header
- [ ] **DATA-02**: Loading state shown on calendar while meetings are being fetched (skeleton or spinner)
- [ ] **DATA-03**: Error state shown if API request fails (user-friendly message, not raw error)
- [ ] **DATA-04**: Meetings are indexed by date string for O(1) lookup per calendar day cell

## v2 Requirements

### Security

- **SEC-01**: Replace localStorage JWT with HttpOnly cookie (requires backend change — out of scope for v1)
- **SEC-02**: Content-Security-Policy headers

### Enhanced Dashboard

- **DASH-01**: Click a day / meeting to navigate to meeting detail page
- **DASH-02**: Create new meeting button on dashboard
- **DASH-03**: Filter meetings by status

### UX

- **UX-01**: Touch/mobile fallback — `onClick` for hover card on touch devices
- **UX-02**: Keyboard navigation for calendar days

## Out of Scope

| Feature | Reason |
|---------|--------|
| Meeting detail page | Not in v1 scope — dashboard only |
| Create / schedule meeting form | Deferred to v2 |
| Meeting room (live video) | Backend has LiveKit; frontend integration deferred |
| Post-meeting recap (transcript, summary) | Deferred to v2 |
| Dark mode | Clean/minimal light theme only for v1 |
| Mobile app | Web-first; mobile later |
| Next.js / SSR | User preference — React SPA only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 to SETUP-06 | Phase 1 | Pending |
| AUTH-01 to AUTH-06 | Phase 1 | Pending |
| CAL-01 to CAL-05 | Phase 2 | Pending |
| HOVER-01 to HOVER-06 | Phase 2 | Pending |
| DATA-01 to DATA-04 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-23*
*Last updated: 2026-03-23 after initial definition*
