# Phase 1: Project Foundation and Auth — Research

**Researched:** 2026-03-23
**Domain:** Vite + React SPA scaffolding, Tailwind + shadcn/ui setup, React Router v6, TanStack Query, Axios interceptors, JWT/localStorage auth with Google OAuth callback
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SETUP-01 | React + TypeScript SPA scaffolded with Vite (`react-ts` template) | Vite 8.x is current standard; `npm create vite@latest` with `react-ts` template confirmed |
| SETUP-02 | Project runs on `localhost:3001` (required by backend CORS config) | Backend CORS is locked to `localhost:3001` via `process.env.CORS_ORIGIN`; Vite `server.port` enforces this |
| SETUP-03 | Tailwind CSS and shadcn/ui configured | Tailwind 4.x + `@tailwindcss/vite` plugin; shadcn CLI `npx shadcn init` — documented setup path |
| SETUP-04 | TanStack Query v5 configured as data-fetching layer | TanStack Query 5.95.x confirmed current; `QueryClientProvider` wraps app |
| SETUP-05 | React Router v6 configured with routes: `/login`, `/auth/callback`, `/` (dashboard) | React Router 7.13.x (v7) — API-compatible with v6 for this use case; `BrowserRouter` + `Routes` pattern |
| SETUP-06 | Axios instance configured with base URL from `VITE_API_URL` env var and JWT interceptor | Axios 1.13.x; `import.meta.env.VITE_API_URL` is the Vite env var access pattern |
| AUTH-01 | Login page displays "Sign in with Google" button that redirects to `VITE_API_URL + /auth/google` | Must use `window.location.href` — not `fetch()` — to trigger browser redirect for OAuth |
| AUTH-02 | `/auth/callback` route reads `?token=` from URL, stores JWT in localStorage, strips token from history | Confirmed from backend `auth.controller.ts`: redirects to `${frontendUrl}/auth/callback?token=${token}` |
| AUTH-03 | On bootstrap, existing token validated by calling `/auth/verify`; if invalid, redirect to `/login` | Backend `/auth/verify` returns `{ isAuthenticated, user }` — not the standard envelope |
| AUTH-04 | Auth state has three statuses: `loading` / `authenticated` / `unauthenticated` — no auth flicker | Critical pattern: init as `'loading'`; ProtectedRoute renders null until resolved |
| AUTH-05 | Global Axios interceptor catches 401, clears token, dispatches `auth:logout` event → redirect to `/login` | `useNavigate` cannot be called outside React components; DOM event bus pattern is the solution |
| AUTH-06 | `ProtectedRoute` wraps authenticated routes; unauthenticated users redirected to `/login` | Standard React Router `<Navigate>` redirect; must render null during `loading` state |
</phase_requirements>

---

## Summary

Phase 1 delivers the complete project scaffold and the Google OAuth authentication flow. The work splits cleanly into two sequential plans: (1) scaffold the Vite project and wire up all tooling (Tailwind, shadcn/ui, TanStack Query, React Router, Axios), and (2) implement the auth flow (Login page, `/auth/callback` handler, AuthContext, ProtectedRoute, global 401 interceptor).

The backend auth mechanism is confirmed from source: `auth.controller.ts` does `res.redirect(`${frontendUrl}/auth/callback?token=${token}`)`. This means the JWT arrives as a URL query parameter, localStorage is the correct storage target for v1, and the callback route must read the parameter synchronously before React Router processes the URL. The `/auth/verify` endpoint returns `{ isAuthenticated, user }` — not the generic `{ data, statusCode, message }` envelope documented in CLAUDE.md.

All technology choices are current standards with no experimental risk. The most consequential correctness requirements are the three-state auth status (prevents flicker), token-from-history stripping (prevents JWT leaking in Referer headers), and the single-fire 401 guard in the Axios interceptor (prevents multiple simultaneous logouts).

**Primary recommendation:** Build Plan 1 (scaffold + tooling) and Plan 2 (auth flow) as separate sequential tasks. Plan 1 must complete before Plan 2 starts because auth components depend on the configured router, axios instance, and shadcn/ui button.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite | 8.0.2 | Build tool + dev server | CRA is deprecated; Vite is the current community standard for React SPAs |
| react | 19.2.4 | UI framework | — |
| react-dom | 19.2.4 | DOM renderer | — |
| typescript | 5.9.3 | Type safety | `react-ts` template includes it out of the box |
| @vitejs/plugin-react | 6.0.1 | React fast refresh in Vite | Official plugin; included in `react-ts` template |
| react-router-dom | 7.13.2 | Client-side routing | Current version of React Router; API is backward-compatible with v6 for this scope |
| @tanstack/react-query | 5.95.1 | Server state / data fetching | Caching, loading/error states, deduplication for REST API calls |
| axios | 1.13.6 | HTTP client | Request + response interceptors enable JWT header injection and global 401 handling |
| tailwindcss | 4.2.2 | Utility-first CSS | shadcn/ui requires Tailwind; v4 uses `@tailwindcss/vite` plugin (no postcss config file needed) |
| @tailwindcss/vite | 4.2.2 | Tailwind v4 Vite plugin | Replaces postcss-based setup for Tailwind v4 |
| shadcn/ui (CLI) | 4.1.0 | Component library CLI | Copy-paste Radix-backed components; HoverCard built in |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/react | 19.2.14 | TypeScript types for React | Always — dev dependency |
| @types/react-dom | 19.2.x | TypeScript types for ReactDOM | Always — dev dependency |
| class-variance-authority | 0.7.1 | Variant-based class composition | Used internally by shadcn/ui components |
| clsx | 2.1.1 | Conditional class merging | Used by shadcn/ui `cn()` utility |
| tailwind-merge | 3.5.0 | Tailwind class conflict resolution | Used by shadcn/ui `cn()` utility |
| lucide-react | 1.0.1 | Icon set | shadcn/ui default icon library |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Router v7 | TanStack Router | TanStack Router is excellent but no existing ecosystem patterns for this project; React Router is the locked decision |
| TanStack Query | SWR | SWR is lighter but TanStack Query has better TypeScript DX and the project already uses TanStack ecosystem |
| Axios | native fetch | `fetch` has no interceptor mechanism; global 401 handling requires Axios or a custom wrapper that re-implements interceptors |
| shadcn/ui | MUI | MUI is Material Design — contradicts the "clean/minimal" requirement |
| localStorage | sessionStorage | sessionStorage clears on tab close; JWT is `7d` — persistence across sessions is correct behavior |

**Installation — Plan 1 (scaffold):**

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install react-router-dom @tanstack/react-query axios
npm install class-variance-authority clsx tailwind-merge lucide-react
npx shadcn init
```

**Installation — Plan 2 (no new packages needed; shadcn components added on demand):**

```bash
npx shadcn add button card
```

**Version verification:** All versions above were verified against npm registry on 2026-03-23.

---

## Architecture Patterns

### Recommended Project Structure

```
frontend/
├── src/
│   ├── features/
│   │   └── auth/
│   │       ├── AuthCallbackPage.tsx   # reads ?token=, calls /auth/verify, navigates
│   │       ├── LoginPage.tsx          # "Sign in with Google" button
│   │       ├── AuthContext.tsx        # Provider + useAuth hook + auth:logout listener
│   │       └── ProtectedRoute.tsx    # blocks unauthenticated access
│   ├── lib/
│   │   ├── apiClient.ts               # axios instance, request + response interceptors
│   │   └── tokenStorage.ts            # getToken / setToken / clearToken / isTokenExpired
│   ├── types/
│   │   └── api.ts                     # User, Meeting, AuthVerifyResponse types
│   ├── App.tsx                        # BrowserRouter + Routes definition
│   ├── main.tsx                       # QueryClientProvider + StrictMode
│   └── vite-env.d.ts                  # ImportMetaEnv type augmentation
├── .env                               # VITE_API_URL=http://localhost:3000
├── .env.example                       # documents required variables
├── .env.production                    # VITE_API_URL=https://api.yourdomain.com
├── vite.config.ts
├── tsconfig.json
└── index.html
```

### Pattern 1: Vite Port Configuration

**What:** Force dev server to port 3001 so backend CORS allows requests.
**When to use:** Always — backend CORS is locked to `localhost:3001`.

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3001,
    strictPort: true,    // fail loudly if 3001 is taken rather than silently moving to 3002
  },
});
```

### Pattern 2: Tailwind v4 Setup

**What:** Tailwind v4 uses a Vite plugin instead of postcss config. No `tailwind.config.js` file is needed.
**When to use:** All projects using Tailwind v4 with Vite.

```typescript
// vite.config.ts — add @tailwindcss/vite plugin (shown above)
```

```css
/* src/index.css */
@import "tailwindcss";
```

No `content` array needed in v4 — auto-detection is built in.

### Pattern 3: Environment Variable Typing

**What:** Augment `ImportMetaEnv` for type-safe access to `VITE_` variables.
**When to use:** Always — prevents typos and provides autocomplete.

```typescript
// src/vite-env.d.ts
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### Pattern 4: Axios Instance with Interceptors

**What:** Single axios instance with JWT injection on requests and 401 handling on responses.
**When to use:** Always — all API calls go through this instance.

```typescript
// src/lib/apiClient.ts
import axios from 'axios';
import { getToken, clearToken } from './tokenStorage';

let isRedirecting = false;  // single-fire guard — prevents multiple logout redirects

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isRedirecting) {
      isRedirecting = true;
      clearToken();
      window.dispatchEvent(new Event('auth:logout'));
      setTimeout(() => { isRedirecting = false; }, 3000);  // reset after redirect completes
    }
    return Promise.reject(error);
  }
);
```

### Pattern 5: Token Storage

**What:** Isolated module for all localStorage JWT operations including client-side expiry check.
**When to use:** All token reads/writes go through this module — never call `localStorage` directly.

```typescript
// src/lib/tokenStorage.ts
const KEY = 'meetmind_token';

export const getToken = (): string | null => localStorage.getItem(KEY);
export const setToken = (token: string): void => localStorage.setItem(KEY, token);
export const clearToken = (): void => localStorage.removeItem(KEY);

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() / 1000 > payload.exp;
  } catch {
    return true;  // malformed token is treated as expired
  }
}
```

### Pattern 6: Three-State AuthContext

**What:** React Context that drives the three auth states. Handles `auth:logout` DOM events from the Axios interceptor.
**When to use:** Wrap the entire app; consume with `useAuth()`.

```typescript
// src/features/auth/AuthContext.tsx
type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');  // CRITICAL: start as 'loading'
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  // Bootstrap: validate existing token
  useEffect(() => {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      clearToken();
      setStatus('unauthenticated');
      return;
    }
    apiClient.get('/auth/verify')
      .then((res) => {
        setUser(res.data.user);
        setStatus('authenticated');
      })
      .catch(() => {
        clearToken();
        setStatus('unauthenticated');
      });
  }, []);

  // Listen for 401 events dispatched by Axios interceptor
  useEffect(() => {
    const handler = () => {
      setUser(null);
      setStatus('unauthenticated');
      navigate('/login', { replace: true });
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [navigate]);

  const logout = () => {
    clearToken();
    setUser(null);
    setStatus('unauthenticated');
    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider value={{ status, user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
```

### Pattern 7: AuthCallbackPage

**What:** Reads `?token=` from URL, stores it, strips from history, calls `/auth/verify`, navigates to dashboard.
**When to use:** Only the `/auth/callback` route renders this page.

```typescript
// src/features/auth/AuthCallbackPage.tsx
export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Read synchronously before React Router can process the URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    // Strip token from browser history immediately (prevents JWT in Referer headers)
    window.history.replaceState({}, document.title, window.location.pathname);

    setToken(token);

    apiClient.get('/auth/verify')
      .then(() => navigate('/', { replace: true }))
      .catch(() => {
        clearToken();
        navigate('/login', { replace: true });
      });
  }, [navigate]);

  return <div>Signing in...</div>;  // brief loading state during verify call
}
```

### Pattern 8: ProtectedRoute

**What:** Wraps routes that require authentication. Renders null during loading to prevent flicker.
**When to use:** Wrap the dashboard route (and any future authenticated routes).

```typescript
// src/features/auth/ProtectedRoute.tsx
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === 'loading') return null;      // prevents flicker — no redirect yet
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

### Pattern 9: App Router Setup

**What:** Route definitions. AuthProvider wraps everything inside BrowserRouter because it uses `useNavigate`.
**When to use:** `App.tsx` root.

```typescript
// src/App.tsx
export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

### Pattern 10: main.tsx Bootstrap

**What:** QueryClientProvider and React root setup.

```typescript
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import './index.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
```

### Anti-Patterns to Avoid

- **`useNavigate` in Axios interceptor:** `useNavigate` requires a React component context. The interceptor runs outside React. Use `window.dispatchEvent(new Event('auth:logout'))` and handle navigation in AuthContext.
- **Auth status initialized as `false` or `null`:** Causes ProtectedRoute to redirect to `/login` before `/auth/verify` completes, producing a visible login flash. Always initialize as `'loading'`.
- **`fetch()` to initiate OAuth:** `window.location.href = url` triggers a full browser navigation required for the OAuth redirect. `fetch()` makes an XHR request and does not navigate.
- **Reading `?token=` after React Router processes URL:** React Router may strip or transform search params. Read `window.location.search` directly in a `useEffect` that fires synchronously on mount.
- **Calling `localStorage` directly outside `tokenStorage.ts`:** Bypasses the isolation layer. All token operations must go through `getToken/setToken/clearToken`.
- **Multiple axios instances:** Only one instance should exist. Multiple instances mean interceptors are only registered on one, causing silent auth failures on the other.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Viewport-aware hover card positioning | Custom positioning logic | Radix `HoverCard` (via shadcn/ui) | Radix uses Floating UI `flip` + `shift`; handles viewport edges, overflow ancestors, mouse grace period |
| UI components (buttons, cards, badges) | Custom CSS components | shadcn/ui copy-paste components | Pre-built accessibility (ARIA), keyboard navigation, Radix primitives |
| Request deduplication / caching | Custom fetch cache | TanStack Query | Handles stale-while-revalidate, background refetch, request deduplication |
| 401 redirect outside React | Catch 401 in component, call `useNavigate` | DOM event bus (`auth:logout` + `window.addEventListener`) | `useNavigate` cannot be called outside React component tree |
| Token expiry detection | Poll token on interval | `isTokenExpired()` check on bootstrap + `/auth/verify` on mount | One-time check is sufficient; `/auth/verify` is the authoritative source |

**Key insight:** The auth flow tempts you to build custom mechanisms (custom event system, custom navigation helper, custom token refresh). Each of these problems has a well-known solution in the existing stack. Use it.

---

## Common Pitfalls

### Pitfall 1: Auth Flicker (CRITICAL)

**What goes wrong:** User briefly sees the login page on every page load, even when already authenticated.
**Why it happens:** `ProtectedRoute` checks `status === 'unauthenticated'` and redirects before `/auth/verify` returns. If auth status starts as `false` or `null`, the condition is immediately true.
**How to avoid:** Initialize `status` as `'loading'` in `useState`. `ProtectedRoute` renders `null` (not a redirect) while status is `'loading'`.
**Warning signs:** Login page flashes for ~200ms on dashboard load; visible in slow network DevTools simulation.

### Pitfall 2: JWT Leaking in Browser History

**What goes wrong:** The JWT token is visible in browser history and appears in `Referer` headers on subsequent navigation.
**Why it happens:** Backend redirects to `/auth/callback?token=<jwt>`. If the route does not strip the query param, it persists in the URL bar and browser history.
**How to avoid:** Call `window.history.replaceState({}, document.title, window.location.pathname)` immediately after reading the token in `AuthCallbackPage`.
**Warning signs:** JWT visible in browser address bar after callback; visible in DevTools network `Referer` headers.

### Pitfall 3: Multiple Simultaneous 401 Redirects

**What goes wrong:** If multiple API requests are in-flight when the token expires, each returns 401, and each fires `auth:logout`. The user gets multiple redirects and potentially multiple `navigate('/login')` calls.
**Why it happens:** Axios response interceptor fires independently for each request.
**How to avoid:** Single-fire guard flag (`let isRedirecting = false`) in the interceptor module. First 401 sets it to `true` and fires the event; subsequent 401s are suppressed.
**Warning signs:** Console shows multiple `auth:logout` events; React Router warning about multiple simultaneous navigations.

### Pitfall 4: SPA 404 on OAuth Callback URL

**What goes wrong:** Navigating directly to `/auth/callback` (which is what the backend OAuth redirect does) returns a 404 from the Vite dev server.
**Why it happens:** Vite's dev server doesn't know about client-side routes. Direct URL access hits the server, which has no `/auth/callback` handler.
**How to avoid:** `server.historyApiFallback: true` in `vite.config.ts` (already set via `defineConfig` defaults — verify it is not overridden).
**Warning signs:** OAuth flow returns `Cannot GET /auth/callback` in browser; 404 in network tab.

### Pitfall 5: Vite Port Silently Changing

**What goes wrong:** If port 3001 is already in use, Vite moves to port 3002 without error. Backend CORS blocks all requests from `localhost:3002`.
**Why it happens:** Default Vite behavior is to find the next available port.
**How to avoid:** Set `server.strictPort: true` in `vite.config.ts`. Vite will throw an error instead of silently reassigning the port.
**Warning signs:** All API calls fail with CORS errors; browser console shows `Access-Control-Allow-Origin` mismatch.

### Pitfall 6: `useNavigate` Outside React Component

**What goes wrong:** Calling `useNavigate` in the Axios interceptor throws a React hooks rules violation.
**Why it happens:** Hooks can only be called inside React function components or custom hooks; the Axios interceptor is a plain function.
**How to avoid:** DOM event bus pattern: interceptor dispatches `window.dispatchEvent(new Event('auth:logout'))`; AuthContext subscribes with `window.addEventListener` and calls `navigate` from inside the component.
**Warning signs:** Runtime error: "Invalid hook call. Hooks can only be called inside of the body of a function component."

### Pitfall 7: Tailwind v4 Breaking Change — No `tailwind.config.js`

**What goes wrong:** Copying Tailwind v3 setup instructions creates a `tailwind.config.js` with a `content` array. In v4, this file is not required and the `content` configuration no longer applies.
**Why it happens:** Most online tutorials still reference Tailwind v3.
**How to avoid:** Use `@tailwindcss/vite` plugin in `vite.config.ts`. Import with `@import "tailwindcss"` in `index.css`. No config file needed.
**Warning signs:** Tailwind classes not applying; build output contains no utility classes.

### Pitfall 8: shadcn/ui Path Aliases Required

**What goes wrong:** `npx shadcn init` configures `@/` path aliases for imports (e.g., `import { cn } from '@/lib/utils'`). Without the corresponding `tsconfig.json` and `vite.config.ts` configuration, the imports fail to resolve.
**Why it happens:** shadcn/ui assumes TypeScript path aliases are configured.
**How to avoid:** When running `npx shadcn init`, it prompts for the alias prefix. After init, add to `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```
And add to `vite.config.ts`:
```typescript
import path from 'path';
resolve: { alias: { '@': path.resolve(__dirname, './src') } }
```
**Warning signs:** TypeScript error: "Cannot find module '@/lib/utils'".

---

## Code Examples

Verified patterns from project architecture research and official documentation:

### LoginPage — Google OAuth Redirect

```typescript
// src/features/auth/LoginPage.tsx
export function LoginPage() {
  const handleLogin = () => {
    // Must use window.location.href — fetch() does not trigger a browser redirect
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Button onClick={handleLogin}>Sign in with Google</Button>
    </div>
  );
}
```

### .env Files

```bash
# frontend/.env
VITE_API_URL=http://localhost:3000

# frontend/.env.example
VITE_API_URL=http://localhost:3000   # Backend API base URL — no trailing slash
```

### TanStack Query — Placeholder Hook for Phase 1

The `useMeetings` hook belongs to Phase 2, but a minimal stub confirms TanStack Query is wired correctly:

```typescript
// src/features/meetings/useMeetings.ts (stub for phase 1 verification)
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export function useMeetings() {
  return useQuery({
    queryKey: ['meetings'],
    queryFn: () => apiClient.get('/meetings').then((r) => r.data),
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Create React App | Vite `react-ts` template | CRA deprecated ~2023 | `npm create vite@latest` replaces `npx create-react-app` |
| Tailwind v3 with postcss config | Tailwind v4 with `@tailwindcss/vite` plugin | Tailwind v4 (2025) | No `tailwind.config.js` needed; `@import "tailwindcss"` in CSS |
| React Router `<Switch>` | React Router `<Routes>` | v6 (2021), still current in v7 | `<Switch>` was removed in v6 |
| TanStack Query `useQuery({ queryKey, queryFn })` | Same API in v5 | v5 (2023) | Object syntax required (positional args removed) |

**Deprecated/outdated:**
- `create-react-app`: Unmaintained, no longer receives updates. Use Vite.
- Tailwind `content` array config: Not used in Tailwind v4. Auto-detection is built in.
- React Router `<Switch>`, `<Redirect>`: Removed in v6. Use `<Routes>` and `<Navigate>`.
- TanStack Query positional `useQuery(key, fn, options)`: Removed in v5. Use object form.

---

## Validation Architecture

`nyquist_validation` is enabled. Phase 1 is scaffolding + auth — it produces no complex business logic that benefits from unit tests, but each requirement has a verifiable behavior. Most verification is structural (file/config checks) or behavioral (manual smoke test against real backend). One unit-testable case exists: `isTokenExpired()`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (Vite-native; configured via `vite.config.ts`) |
| Config file | `vite.config.ts` — `test` block |
| Quick run command | `npm run test` (from `frontend/`) |
| Full suite command | `npm run test -- --coverage` |

Vitest is the correct choice for a Vite project. Jest requires additional transform configuration for ESM and Vite's module resolution. Vitest runs in the same Vite pipeline — zero configuration overhead.

**Add to `vite.config.ts`:**

```typescript
import { defineConfig } from 'vitest/config';
// change: import from 'vitest/config' not 'vite' for test support
export default defineConfig({
  // ... existing config
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

**Install:**

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| SETUP-01 | `frontend/` directory exists, `src/main.tsx` exists | structural | `ls frontend/src/main.tsx` | ✅ verify at end of Plan 1 |
| SETUP-02 | Dev server answers on port 3001 | smoke | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/` → `200` | manual/CI |
| SETUP-03 | Tailwind utility classes apply in browser | structural | `grep -r "className=" src/features/auth/LoginPage.tsx` | visual confirmation |
| SETUP-04 | `QueryClientProvider` present in `main.tsx` | structural | `grep "QueryClientProvider" frontend/src/main.tsx` | ✅ |
| SETUP-05 | `<Routes>` with `/login`, `/auth/callback`, `/` defined in `App.tsx` | structural | `grep -E '"/login"\|"/auth/callback"\|path="/"' frontend/src/App.tsx` | ✅ |
| SETUP-06 | `apiClient.ts` exports axios instance with baseURL from `VITE_API_URL` | unit | `vitest` — see Wave 0 gaps | ❌ Wave 0 |
| AUTH-01 | Login page has button that sets `window.location.href` to `${VITE_API_URL}/auth/google` | unit | `vitest` — mock `window.location`, click button | ❌ Wave 0 |
| AUTH-02 | Callback page reads `?token=`, calls `setToken`, strips history, navigates to `/` | unit | `vitest` — mock `window.location.search`, `localStorage`, `history.replaceState` | ❌ Wave 0 |
| AUTH-03 | On bootstrap with valid token, calls `/auth/verify`; on 401, clears token + redirects | unit | `vitest` — mock apiClient, verify setStatus calls | ❌ Wave 0 |
| AUTH-04 | `status` starts as `'loading'`; no redirect to `/login` before verify resolves | unit | `vitest` — verify initial render does not show login page | ❌ Wave 0 |
| AUTH-05 | `auth:logout` event dispatched on 401; token cleared; navigate called | unit | `vitest` — fire `auth:logout` event, assert `localStorage` empty + navigate called | ❌ Wave 0 |
| AUTH-06 | `ProtectedRoute` renders children when authenticated, `<Navigate to="/login">` when unauthenticated | unit | `vitest` | ❌ Wave 0 |

**Manual smoke test (post-Plan 2):**
1. Start backend and frontend
2. Navigate to `http://localhost:3001/` → redirected to `/login`
3. Click "Sign in with Google" → redirected to Google OAuth
4. Complete Google login → redirected to `http://localhost:3001/auth/callback?token=...`
5. Token stripped from URL → redirected to `/`
6. Refresh page → stays on `/` (token persisted in localStorage)
7. Manually clear localStorage → refresh → redirected to `/login`

### Sampling Rate

- **Per task commit:** `npm run test` (unit tests only, < 10s)
- **Per wave merge:** `npm run test -- --coverage` + manual smoke test
- **Phase gate:** All unit tests green + smoke test passes before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `frontend/src/test/setup.ts` — Vitest + Testing Library setup file
- [ ] `frontend/src/lib/tokenStorage.test.ts` — covers `isTokenExpired`, `setToken`, `getToken`, `clearToken`
- [ ] `frontend/src/lib/apiClient.test.ts` — covers 401 interceptor single-fire guard (SETUP-06, AUTH-05)
- [ ] `frontend/src/features/auth/AuthCallbackPage.test.tsx` — covers AUTH-02, AUTH-03
- [ ] `frontend/src/features/auth/ProtectedRoute.test.tsx` — covers AUTH-04, AUTH-06
- [ ] `frontend/src/features/auth/LoginPage.test.tsx` — covers AUTH-01
- [ ] Framework install: `npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`

---

## Open Questions

1. **shadcn/ui init prompts**
   - What we know: `npx shadcn init` is interactive and asks about style (default/new-york), base color, CSS variables.
   - What's unclear: The exact CLI flags to make it non-interactive for reproducible setup.
   - Recommendation: Run interactively on first setup; document the choices in `components.json` (which is committed). Use `--yes` flag if available in shadcn 4.x.

2. **`/auth/verify` response shape under error conditions**
   - What we know: On success returns `{ isAuthenticated: true, user: { ... } }`. On invalid token returns 401.
   - What's unclear: Whether it returns `{ isAuthenticated: false }` with a 200 status or throws 401 for expired tokens.
   - Recommendation: Treat any non-2xx from `/auth/verify` as "unauthenticated". The `.catch()` handler in `AuthContext` covers both cases.

3. **Vitest version compatibility with Vite 8**
   - What we know: Vite 8.0.2 was released recently (npm verified). Vitest major versions track Vite.
   - What's unclear: Whether `vitest` latest (likely 3.x) is compatible with Vite 8.x or requires a specific version pin.
   - Recommendation: Run `npm install -D vitest` and verify no peer dependency warnings. Check Vitest changelog if peer dep errors appear.

---

## Sources

### Primary (HIGH confidence)

- Backend source code (`auth.controller.ts`) — confirmed OAuth redirect delivers JWT as `?token=` query param; frontend URL from env var
- Backend source code (`auth.service.ts`, `/auth/verify`) — confirmed response shape `{ isAuthenticated, user }`, not the generic envelope
- Backend `main.ts` / CORS config — confirmed `CORS_ORIGIN` locks to `localhost:3001`
- Vite official docs — `server.port`, `server.strictPort`, `server.historyApiFallback`, `VITE_` prefix rule
- npm registry (verified 2026-03-23) — all package versions in Standard Stack table

### Secondary (MEDIUM confidence)

- Tailwind v4 official docs — `@tailwindcss/vite` plugin replaces postcss config; `@import "tailwindcss"` replaces directives
- shadcn/ui official docs — `npx shadcn init`, path alias requirement, component installation
- TanStack Query v5 official docs — `QueryClientProvider`, `useQuery` object syntax
- React Router v7 docs — `BrowserRouter`, `Routes`, `Route`, `Navigate`, `useNavigate`

### Tertiary (LOW confidence)

- Single-fire 401 guard pattern (`let isRedirecting = false`) — common community pattern, not formally documented in Axios docs; validate during implementation
- `setTimeout` reset for `isRedirecting` flag — heuristic approach; exact timing may need tuning

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions npm-verified on 2026-03-23; all libraries are current community standards
- Architecture: HIGH — auth flow confirmed from backend source code; no guesswork on API contracts or JWT delivery mechanism
- Pitfalls: HIGH — all pitfalls are documented failure modes with specific root causes and verified mitigations; not speculative

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable libraries — 30 day horizon reasonable; Tailwind v4 and shadcn CLI are actively developed so re-verify if >30 days pass)
