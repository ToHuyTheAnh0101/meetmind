# MeetMind

## What This Is

MeetMind is a React web application that gives users a visual overview of their meetings. After logging in via Google OAuth, users land on a monthly calendar dashboard where days with meetings are visually indicated — hovering a date reveals a card showing meeting title, time, and status for that day.

The backend (NestJS + TypeORM + PostgreSQL + LiveKit + AI) is already built. This project scopes the frontend.

## Core Value

Users can see all their meetings at a glance and know the status of each one without navigating away from the dashboard.

## Requirements

### Validated

- ✓ Google OAuth login — existing backend
- ✓ JWT-based auth with `/auth/verify` endpoint — existing backend
- ✓ Meetings API returning scheduled/ongoing/completed/cancelled meetings — existing backend
- ✓ User-scoped meetings (organizer + participant) — existing backend

### Active

- [ ] React web app with Google OAuth login flow
- [ ] Monthly calendar dashboard as the landing screen after login
- [ ] Visual indicator on calendar days that have at least one meeting
- [ ] Hover card on a date showing: meeting title, start/end time, and status for all meetings that day
- [ ] Clean, minimal UI design

### Out of Scope

- Meeting detail page — not needed for v1, dashboard is the full scope
- Create / schedule meeting form — deferred to future milestone
- Meeting room (live video) — backend has LiveKit, frontend integration deferred
- Post-meeting recap screen (transcript, summary, action items) — deferred
- Mobile app — web-first, mobile later
- Dark mode — clean/minimal light theme only for v1

## Context

- **Backend URL**: `http://localhost:3000` (configurable via env)
- **Auth flow**: Frontend redirects to `/auth/google` → backend handles OAuth → redirects back with JWT token
- **Meetings API**: `GET /meetings` returns meetings for the authenticated user
- **Frontend port**: `3001` (already configured in backend CORS)
- **Token storage**: JWT stored client-side (localStorage or cookie), sent as `Authorization: Bearer <token>`
- **Existing backend response format**: `{ data: {...}, statusCode: 200, message: "..." }`

## Constraints

- **Tech Stack**: React (no Next.js) — user's explicit choice
- **Backend API**: Must consume existing NestJS REST API — no backend changes in scope
- **Auth**: Must use existing Google OAuth flow via backend redirect, not a new auth system
- **Compatibility**: Frontend runs on port 3001 (already whitelisted in backend CORS)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React (not Next.js) | User preference — simpler setup, no SSR needed for v1 | — Pending |
| v1 scope = calendar dashboard only | Focus on the core value before expanding | — Pending |
| Hover card shows title + time + status | User confirmed exactly these fields | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-23 after initialization*
