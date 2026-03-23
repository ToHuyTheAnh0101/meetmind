# Architecture Research

## Key Findings (from backend source code)

1. **Auth flow is a browser redirect, not JSON.** `auth.controller.ts` does `res.redirect(\`${frontendUrl}/auth/callback?token=${token}\`)`. Frontend needs a `/auth/callback` route that reads `?token=` from the URL.

2. **JWT payload is minimal** — only `{ sub, email }`. Call `/auth/verify` on app load to get full user object (`firstName`, `lastName`, `picture`).

3. **All meeting endpoints require `JwtAuthGuard`** — no public listing APIs. Every fetch needs the `Authorization` header.

4. **CORS is locked to `localhost:3001`** via `process.env.CORS_ORIGIN`. Frontend dev server must run on that port.

5. **Response envelope is inconsistently applied.** Meetings endpoints return raw `Meeting[]`/`Meeting`, not wrapped in `{ data, statusCode, message }`. Auth verify returns plain `{ isAuthenticated, user }`. Do not write a generic unwrapper — unwrap per endpoint where actually needed.

## Project Structure

Feature-based layout (not layer-based). Layer-based collapses once you have 3+ features because `hooks/`, `services/`, `components/` become dumping grounds.

```
frontend/src/
├── features/
│   ├── auth/
│   │   ├── AuthCallbackPage.tsx   # handles /auth/callback?token=...
│   │   ├── LoginPage.tsx
│   │   ├── useAuth.ts
│   │   ├── authApi.ts
│   │   └── ProtectedRoute.tsx
│   └── meetings/
│       ├── DashboardPage.tsx
│       ├── CalendarView.tsx
│       ├── MeetingHoverCard.tsx
│       ├── useMeetings.ts
│       └── meetingsApi.ts
├── lib/
│   ├── apiClient.ts               # axios instance with interceptors
│   └── tokenStorage.ts
├── types/
│   └── api.ts
├── App.tsx
└── main.tsx
```

## API Layer

Two-layer pattern: **axios instance** (auth headers + error interception) + **feature API modules** (thin wrappers) + **TanStack Query hooks** (data fetching state in components).

```typescript
// src/lib/apiClient.ts
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

```typescript
// src/features/meetings/meetingsApi.ts
export async function fetchMeetings(): Promise<Meeting[]> {
  const res = await apiClient.get('/meetings');
  return res.data; // raw array — no envelope
}
```

```typescript
// src/features/meetings/useMeetings.ts
export function useMeetings() {
  return useQuery({ queryKey: ['meetings'], queryFn: fetchMeetings });
}
```

## Auth State

**localStorage + React Context. No third-party auth library.**

One auth method (Google OAuth), no login form, no refresh token. Auth0/Clerk would require wrapping the existing backend OAuth flow — unnecessary complexity.

**Token storage:** `localStorage` (not sessionStorage — lost on tab close). Backend sets `JWT_EXPIRATION=7d` so persistence across sessions is correct.

```typescript
// src/lib/tokenStorage.ts
const KEY = 'meetmind_token';
export const getToken = () => localStorage.getItem(KEY);
export const setToken = (t: string) => localStorage.setItem(KEY, t);
export const clearToken = () => localStorage.removeItem(KEY);

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() / 1000 > payload.exp;
  } catch {
    return true;
  }
}
```

**Auth flow:**
```
/login          → "Sign in with Google" → redirect to VITE_API_URL + /auth/google
/auth/callback  → read ?token= → setToken() → call /auth/verify → store user → navigate(/)
/*              → ProtectedRoute checks user !== null
```

**On app mount:** read token → if present and not expired → call `/auth/verify` → store user. If verify returns 401, clear token and redirect to `/login`.

**Do not decode JWT client-side for user info.** Payload is `{ sub, email }` only. Full user shape comes from `/auth/verify`.

## Environment Config

```
frontend/
├── .env              # VITE_API_URL=http://localhost:3000
├── .env.local        # developer overrides (not committed)
├── .env.production   # VITE_API_URL=https://api.yourdomain.com
└── .env.example      # documents required variables
```

Only `VITE_`-prefixed variables are exposed to browser code (Vite security boundary).

Add type safety in `src/vite-env.d.ts`:
```typescript
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}
```

## Error Handling

Central error bus in the axios response interceptor.

**The `useNavigate` problem:** `useNavigate` can't be called outside React components. Solution: dispatch a custom DOM event that AuthContext listens for.

```typescript
// apiClient.ts response interceptor
if (status === 401) {
  clearToken();
  window.dispatchEvent(new Event('auth:logout'));
}
```

```typescript
// AuthContext provider
useEffect(() => {
  const handler = () => { clearToken(); setUser(null); navigate('/login'); };
  window.addEventListener('auth:logout', handler);
  return () => window.removeEventListener('auth:logout', handler);
}, [navigate]);
```

| Status | Cause | Action |
|--------|-------|--------|
| 401 | Token expired / invalid | Clear token, dispatch `auth:logout`, redirect to `/login` |
| 403 | Insufficient permissions | Show error toast, stay on page |
| 404 | Resource not found | Show 404 state in component |
| 400 | Validation error | Surface `error.response.data.message` |
| 500+ | Server error | Show generic toast |

---
*Research: 2026-03-23*
