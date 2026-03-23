# Features Research

## Calendar View Patterns

Use the **dot-below-number pattern** (Calendly/Apple Calendar style), not inline event pills. A single dot per day cell, centered below the date number, indicates meetings exist on that day. Fixed 6-row grid avoids layout shift as months change.

- `react-big-calendar` with custom `dateCellWrapper` or `components.event` slot works well
- Alternatively: hand-rolled CSS Grid calendar with `date-fns` for date math
- Avoid FullCalendar (heavier, opinionated styling harder to keep "minimal")

## Hover Card UX

- **Open delay:** 500ms (prevents cards popping on accidental mouse-overs)
- **Close delay:** 300ms with grace period so cursor can enter the card without it dismissing
- **Width:** 220–280px
- **Content:** List all meetings for that day vertically (title, time, status badge per meeting)
- **Positioning:** Use Radix UI `HoverCard` — it uses Floating UI internally for automatic viewport overflow/flip handling
- **Accessibility:** `role="tooltip"` is sufficient for v1 read-only content

## Auth Flow Pattern

- Backend redirects to `/auth/callback?token=<jwt>` after Google OAuth
- Frontend reads `?token=` from URL query string
- **Immediately call `history.replaceState`** to strip token from browser history (prevents leaking in Referer headers)
- Store a `state` param in `sessionStorage` before OAuth redirect and verify on callback to prevent CSRF
- Call `/auth/verify` on app bootstrap to detect expired/invalid tokens early

## JWT Storage

Use **localStorage** for v1 — the backend embeds the token in the redirect URL as a query param, so JavaScript must read it (httpOnly cookies would require backend changes that are out of scope).

Mitigations for localStorage XSS risk:
- Short expiry (backend already sets 7d — acceptable for v1)
- Content-Security-Policy header
- Clean logout that clears token

Document httpOnly cookie upgrade as a future milestone improvement.

## Status Indicators

| Status | Color | Tailwind class |
|--------|-------|---------------|
| scheduled | Blue | `bg-blue-500` |
| ongoing | Green | `bg-green-500` |
| completed | Gray | `bg-gray-400` |
| cancelled | Red | `bg-red-400` |

**Calendar dot priority** when a day has multiple meeting statuses: ongoing > scheduled > completed > cancelled.

Always pair color with a text label for accessibility (never color alone).

---
*Research: 2026-03-23*
