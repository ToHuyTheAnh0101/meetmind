# Pitfalls Research

## Calendar Pitfalls

| Pitfall | Mitigation |
|---------|------------|
| UTC vs local time mismatch — meetings appear on wrong day for UTC+ users | Use `date-fns-tz` for timezone-aware date comparisons |
| Month boundary off-by-one due to Sunday vs Monday week-start assumption | Use `date-fns` grid helpers; configure week start explicitly |
| Re-rendering all 42 cells on hover state change | `React.memo` on day cells + pre-indexed meeting map keyed by date string |
| Fetching all meetings instead of a windowed date range | Pass `startDate`/`endDate` query params to `/meetings` API (add to backend if needed) |

## Hover Card Pitfalls

| Pitfall | Mitigation |
|---------|------------|
| Clipped by `overflow: hidden` ancestors (most common bug) | Render card via React portal to `document.body` |
| Overflows viewport edges at calendar corners | Radix `HoverCard` uses Floating UI `flip` + `shift` — use it, don't roll your own |
| z-index wars with sticky headers / modals | Portals + consistent z-index scale (`z-50` for cards) |
| No hover event on touch devices — feature silently broken on mobile | Add `onClick` fallback for touch (v1 is desktop-first, but still worth noting) |
| Card dismisses when moving mouse from trigger to card | Radix `HoverCard` handles this — don't build a custom hover system |

## OAuth Redirect Pitfalls

| Pitfall | Mitigation |
|---------|------------|
| Token extraction race with React Router | Read `window.location.search` synchronously before router processes URL |
| Double-login loop from auth state checking before verify completes | Three-state auth status: `'loading'` / `'authenticated'` / `'unauthenticated'` |
| JWT leaking in browser history and `Referer` headers | Call `navigate(route, { replace: true })` immediately after token extraction |
| Using `fetch()` to initiate OAuth instead of full navigation | OAuth redirect must use `window.location.href = ...`, not `fetch()` |

## JWT Handling Pitfalls

| Pitfall | Mitigation |
|---------|------------|
| Token expiry not handled — silent 401s | Global Axios response interceptor that catches 401s and dispatches `auth:logout` |
| Auth flicker on page load — shows login briefly before auth check completes | Init auth status as `'loading'`, not `false` — render nothing until resolved |
| Multiple simultaneous 401s trigger multiple logout redirects | Single-fire guard flag in the interceptor |
| Decoding JWT client-side for user data | Don't — payload is `{ sub, email }` only. Get full user from `/auth/verify` |

## React SPA Pitfalls

| Pitfall | Mitigation |
|---------|------------|
| Missing loading states — empty calendar misread as "no meetings" | Skeleton loader on calendar while TanStack Query is fetching |
| No error boundaries — one null field crashes whole page | ErrorBoundary at route level; TanStack Query `isError` for API errors |
| `useEffect` over-fetching from bad dependency arrays | Use TanStack Query — it handles caching and deduplication |
| Calendar cells keyed by index instead of date string | Key day cells by ISO date string, not array index |
| SPA routes return 404 on direct access / refresh | Vite: `server.historyApiFallback: true` in dev. Critical for `/auth/callback` |

---
*Research: 2026-03-23*
