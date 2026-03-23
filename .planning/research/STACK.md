# Stack Research

## Recommendation

**Vite + React + shadcn/ui + TanStack Query + react-big-calendar**

Clean, minimal, and well-matched to the use case. Vite is the current standard for React SPAs (CRA is deprecated). shadcn/ui's identity is "clean minimal". TanStack Query handles REST API data fetching with caching. react-big-calendar has a renderless `components.event` slot that makes HoverCard integration trivial.

## Calendar Library

| Library | Stars | License | Monthly View | Custom Events | Notes |
|---------|-------|---------|--------------|---------------|-------|
| react-big-calendar | ~13k | MIT | ✓ | Yes — `components.event` slot | Best fit — easy custom day cell rendering |
| FullCalendar | ~18k | MIT/Commercial | ✓ | Yes | React wrapper is solid but heavier |
| Custom (CSS Grid) | — | — | Build yourself | Full control | Over-engineering for v1 |

**Recommendation:** `react-big-calendar` with `date-fns` localizer. The `components.dateCellWrapper` or `components.event` slot makes it trivial to inject HoverCard content per day. MIT license.

## UI Library

| Library | Style | "Clean minimal" fit | Notes |
|---------|-------|---------------------|-------|
| shadcn/ui + Tailwind | Copy-paste components | Excellent — this is its identity | Radix primitives for accessibility |
| MUI | Opinionated Material Design | Poor — Material look is distinct | Heavy bundle |
| Radix UI (headless) | Headless primitives | Good but requires all styling from scratch | Use via shadcn |
| Ant Design | Business/enterprise | Moderate | Heavier, more opinionated |

**Recommendation:** shadcn/ui + Tailwind CSS. HoverCard component is built-in (`@radix-ui/react-hover-card`). Copy-paste ownership means no dependency lock-in.

## State Management

| Concern | Solution | Why |
|---------|----------|-----|
| Server data (meetings) | TanStack Query v5 | Caching, background refetch, loading/error states |
| Auth state (user + token) | React Context + `useAuth()` hook | JWT is simple session state — no store needed |
| UI state | Local `useState` | Calendar month navigation, hover state |

**Recommendation:** TanStack Query for API data, React Context for auth. No Zustand/Redux needed for v1 scope.

## Scaffolding

**Recommendation:** Vite with `react-ts` template.

```bash
npm create vite@latest frontend -- --template react-ts
```

- CRA is deprecated and unmaintained
- Vite is the current community standard
- Fast HMR, TypeScript out of the box
- Compatible with shadcn/ui setup

## Summary Table

| Concern | Recommended | Why |
|---------|-------------|-----|
| Scaffolding | Vite (`react-ts`) | CRA deprecated; Vite is current standard |
| Calendar | `react-big-calendar` + `date-fns` | Custom event slot makes HoverCard trivial; MIT |
| UI system | shadcn/ui + Tailwind CSS | "Clean minimal" is its identity; Radix accessibility |
| Server state | TanStack Query v5 | Best caching DX for REST APIs; TypeScript-native |
| Auth state | React Context + `useAuth()` | JWT is simple session state; no global store needed |
| Routing | React Router v6 | Proven, simple; v7 adds SSR complexity not needed |
| HTTP client | Axios | Interceptors for JWT `Authorization` header injection |

## Key Risk

Verify whether the NestJS backend delivers the JWT as a query param in the OAuth redirect URL or as a `Set-Cookie` header — this determines the `/auth/callback` implementation approach.

---
*Research: 2026-03-23*
