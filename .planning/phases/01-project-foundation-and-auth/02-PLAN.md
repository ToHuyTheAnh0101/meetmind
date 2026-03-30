---
phase: 01-project-foundation-and-auth
plan: 02
type: execute
wave: 2
depends_on:
  - 01-01
files_modified:
  - frontend/src/features/auth/LoginPage.tsx
  - frontend/src/features/auth/AuthCallbackPage.tsx
  - frontend/src/features/auth/AuthContext.tsx
  - frontend/src/features/auth/ProtectedRoute.tsx
  - frontend/src/types/api.ts
  - frontend/src/App.tsx
  - frontend/src/index.css
autonomous: true
requirements:
  - AUTH-01
  - AUTH-02
  - AUTH-03
  - AUTH-04
  - AUTH-05
  - AUTH-06
must_haves:
  truths:
    - "Login page displays 'Sign in with Google' button that redirects to backend OAuth endpoint"
    - "Auth callback route reads ?token= from URL, stores JWT in localStorage, strips token from history"
    - "On app bootstrap, existing token is validated by calling /auth/verify; invalid tokens redirect to /login"
    - "Auth state has three statuses: loading / authenticated / unauthenticated — no flicker"
    - "Global Axios 401 interceptor clears token and dispatches auth:logout event → redirect to /login"
    - "ProtectedRoute wraps authenticated routes; unauthenticated users redirected to /login"
  artifacts:
    - path: "frontend/src/features/auth/LoginPage.tsx"
      provides: "Login page with Google OAuth button per UI-SPEC"
      min_lines: 40
    - path: "frontend/src/features/auth/AuthCallbackPage.tsx"
      provides: "Callback handler that processes JWT from URL"
      min_lines: 30
    - path: "frontend/src/features/auth/AuthContext.tsx"
      provides: "Three-state auth context with logout event listener"
      exports: ["AuthProvider", "useAuth"]
      min_lines: 60
    - path: "frontend/src/features/auth/ProtectedRoute.tsx"
      provides: "Route guard that renders null during loading"
      exports: ["ProtectedRoute"]
      min_lines: 15
    - path: "frontend/src/types/api.ts"
      provides: "User and AuthVerifyResponse types"
      exports: ["User", "AuthVerifyResponse"]
      min_lines: 10
  key_links:
    - from: "frontend/src/features/auth/LoginPage.tsx"
      to: "VITE_API_URL + /auth/google"
      via: "window.location.href redirect"
      pattern: "window\.location\.href.*auth/google"
    - from: "frontend/src/features/auth/AuthCallbackPage.tsx"
      to: "localStorage"
      via: "setToken(token)"
      pattern: "setToken\(token\)"
    - from: "frontend/src/features/auth/AuthCallbackPage.tsx"
      to: "/auth/verify"
      via: "apiClient.get('/auth/verify')"
      pattern: "apiClient\.get\(['\"]\/auth\/verify['\"]"
    - from: "frontend/src/features/auth/AuthContext.tsx"
      to: "/auth/verify"
      via: "bootstrap validation"
      pattern: "apiClient\.get\(['\"]\/auth\/verify['\"]"
    - from: "frontend/src/features/auth/ProtectedRoute.tsx"
      to: "AuthContext"
      via: "useAuth() hook"
      pattern: "useAuth\(\)"
---

<objective>
Implement complete Google OAuth authentication flow with three-state auth management
</objective>

<purpose>
Enable users to sign in with Google and access the protected dashboard. This plan implements the full auth lifecycle: login redirect, callback token processing, token validation on bootstrap, protected route enforcement, and automatic logout on 401. The three-state auth pattern prevents auth flicker, and the DOM event bus pattern enables 401 handling outside React components.
</purpose>

<output>
- Login page with Google OAuth button matching UI-SPEC design
- Auth callback page that processes JWT and redirects to dashboard
- AuthContext with three-state management (loading/authenticated/unauthenticated)
- ProtectedRoute component that prevents unauthorized access
- Full auth flow integrated into App router
</output>

<execution_context>
@/home/theanh/meetmind/.claude/get-shit-done/workflows/execute-plan.md
@/home/theanh/meetmind/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-project-foundation-and-auth/01-RESEARCH.md
@.planning/phases/01-project-foundation-and-auth/01-UI-SPEC.md
@.planning/REQUIREMENTS.md
@frontend/src/lib/apiClient.ts
@frontend/src/lib/tokenStorage.ts
</context>

<interfaces>
<!-- Key interfaces from Plan 1 that this plan consumes -->
From src/lib/apiClient.ts:
```typescript
export const apiClient: AxiosInstance
// Request interceptor: adds Authorization header
// Response interceptor: handles 401 with auth:logout event
```

From src/lib/tokenStorage.ts:
```typescript
export const getToken: () => string | null
export const setToken: (token: string) => void
export const clearToken: () => void
export const isTokenExpired: (token: string) => boolean
```
</interfaces>

<tasks>
  <task type="auto" tdd="true">
    <name>Task 1: Create types, LoginPage, and AuthCallbackPage per UI-SPEC</name>
    <files>
    frontend/src/types/api.ts
    frontend/src/features/auth/LoginPage.tsx
    frontend/src/features/auth/AuthCallbackPage.tsx
    frontend/src/index.css
    </files>
    <behavior>
    - Test 1: LoginPage renders "MeetMind" wordmark above card, card shows "Welcome to MeetMind" heading, "Sign in to manage your meetings" subheading, and full-width "Sign in with Google" button with Google icon
    - Test 2: Button click triggers window.location.href to VITE_API_URL + /auth/google
    - Test 3: AuthCallbackPage reads ?token= from URL synchronously before React Router processing
    - Test 4: AuthCallbackPage stores token via setToken, strips from history via replaceState, calls /auth/verify, navigates to / on success or /login on failure
    - Test 5: AuthCallbackPage shows loading spinner with "Signing you in…" text during processing
    </behavior>
    <action>
    **Step 1: Create type definitions (frontend/src/types/api.ts)**
    - Export User interface: { id: string; email: string; name: string; imageUrl?: string }
    - Export AuthVerifyResponse interface: { isAuthenticated: boolean; user: User | null }
    - These match backend /auth/verify response structure

    **Step 2: Create LoginPage (frontend/src/features/auth/LoginPage.tsx)**
    - Layout: Full viewport flex center, MeetMind wordmark (20px semibold) above card
    - Card: max-w-[400px], bg-zinc-50, border zinc-200, rounded-lg
    - Card content:
      - Heading: "Welcome to MeetMind" (28px semibold, zinc-950)
      - Subheading: "Sign in to manage your meetings" (16px regular, zinc-500)
      - Button: Full width, min-height 44px, zinc-900 fill, white text
      - Button icon: Google "G" SVG (20x20px) positioned left of label with 4px gap
    - Button onClick: `window.location.href = \`${import.meta.env.VITE_API_URL}/auth/google\`;`
    - Error state: role="alert" div below button, red-500 text (not used yet, structure ready)
    - Copy per UI-SPEC: No exclamation marks, sentence case

    **Step 3: Create AuthCallbackPage (frontend/src/features/auth/AuthCallbackPage.tsx)**
    - Layout: Full viewport flex center, single column
    - UseEffect runs synchronously on mount:
      1. Read `window.location.search` directly (not via React Router)
      2. Parse URLSearchParams, get token
      3. If no token: navigate to /login with replace
      4. Strip token: `window.history.replaceState({}, document.title, window.location.pathname)`
      5. Call setToken(token)
      6. Call apiClient.get('/auth/verify')
      7. On success: navigate to / with replace
      8. On failure: clearToken(), navigate to /login with replace
    - Loading state: Loader2 icon (24px, animate-spin, zinc-400) + "Signing you in…" text (16px, zinc-500)
    - ARIA: Loader2 has aria-label="Signing you in"

    **Step 4: Add custom CSS animations (frontend/src/index.css)**
    - Add @import "tailwindcss" (already exists from Plan 1)
    - Add custom spinner animation if needed (Tailwind has animate-spin built-in)
    - Ensure zinc color palette is available (shadcn config handles this)

    **UI-SPEC compliance checklist:**
    - [ ] MeetMind wordmark above card (20px semibold, zinc-950)
    - [ ] Card heading: "Welcome to MeetMind" (28px/600)
    - [ ] Card subheading: "Sign in to manage your meetings" (16px/400, zinc-500)
    - [ ] Button: "Sign in with Google" with Google G icon, 44px min height
    - [ ] Button variant: zinc-900 fill, white text (not Google blue)
    - [ ] Callback: Spinner + "Signing you in…" only, no chrome
    - [ ] Spacing: 48px between wordmark and card, sm (8px) between heading/subheading
    </action>
    <verify>
    <automated>cd frontend
# Check LoginPage structure
grep -q "Sign in with Google" src/features/auth/LoginPage.tsx && echo "Login button text present"
grep -q "window.location.href" src/features/auth/LoginPage.tsx && echo "OAuth redirect implemented"
grep -q "Google" src/features/auth/LoginPage.tsx && echo "Google icon reference present"
# Check AuthCallbackPage structure
grep -q "URLSearchParams" src/features/auth/AuthCallbackPage.tsx && echo "Token parsing present"
grep -q "replaceState" src/features/auth/AuthCallbackPage.tsx && echo "History stripping present"
grep -q "setToken" src/features/auth/AuthCallbackPage.tsx && echo "Token storage present"
grep -q "/auth/verify" src/features/auth/AuthCallbackPage.tsx && echo "Verify call present"
# Check types
grep -q "User" src/types/api.ts && grep -q "AuthVerifyResponse" src/types/api.ts && echo "Types defined"
</automated>
    </verify>
    <done>
    - User and AuthVerifyResponse types exported from src/types/api.ts
    - LoginPage renders with correct copy, layout, and Google OAuth button
    - AuthCallbackPage processes token from URL, strips history, validates, navigates
    - Loading spinner shown on callback page during processing
    - UI matches UI-SPEC design contract exactly
    </done>
  </task>

  <task type="auto" tdd="true">
    <name>Task 2: Create AuthContext, ProtectedRoute, and integrate into App</name>
    <files>
    frontend/src/features/auth/AuthContext.tsx
    frontend/src/features/auth/ProtectedRoute.tsx
    frontend/src/App.tsx
    </files>
    <behavior>
    - Test 1: AuthProvider initializes status as 'loading' (not false/null) to prevent flicker
    - Test 2: On mount, AuthProvider checks for existing token and calls /auth/verify
    - Test 3: Valid token → status = 'authenticated', user = user object
    - Test 4: Invalid/expired token → clearToken(), status = 'unauthenticated'
    - Test 5: AuthContext listens for 'auth:logout' event and navigates to /login
    - Test 6: ProtectedRoute renders null when status = 'loading'
    - Test 7: ProtectedRoute redirects to /login when status = 'unauthenticated'
    - Test 8: ProtectedRoute renders children when status = 'authenticated'
    </behavior>
    <action>
    **Step 1: Create AuthContext (frontend/src/features/auth/AuthContext.tsx)**
    - Define AuthStatus type: 'loading' | 'authenticated' | 'unauthenticated'
    - Define AuthState interface: { status: AuthStatus; user: User | null; logout: () => void }
    - Create AuthContext with createContext<AuthState | null>(null)
    - AuthProvider component:
      - State: status = 'loading' (CRITICAL: prevents flicker per AUTH-04)
      - State: user = null
      - useNavigate hook for programmatic navigation
      - useEffect 1 (bootstrap): Runs on mount
        - Get token from getToken()
        - If no token or isTokenExpired(token): clearToken(), setStatus('unauthenticated')
        - Else: apiClient.get('/auth/verify')
          - Success: setUser(res.data.user), setStatus('authenticated')
          - Failure: clearToken(), setStatus('unauthenticated')
      - useEffect 2 (event listener): Listens for 'auth:logout' DOM event
        - Handler: setUser(null), setStatus('unauthenticated'), navigate('/login', { replace: true })
        - Cleanup: removeEventListener on unmount
      - logout function: clearToken(), setUser(null), setStatus('unauthenticated'), navigate('/login')
      - Provider: Wraps children with AuthContext.Provider
    - useAuth hook: Returns context, throws error if used outside Provider
    - Export: AuthProvider, useAuth

    **Step 2: Create ProtectedRoute (frontend/src/features/auth/ProtectedRoute.tsx)**
    - Component receives children prop
    - Calls useAuth() to get status
    - Logic:
      - If status === 'loading': return null (prevents flicker — no redirect yet)
      - If status === 'unauthenticated': return <Navigate to="/login" replace />
      - If status === 'authenticated': return <>{children}</>
    - Export: ProtectedRoute

    **Step 3: Update App.tsx route structure**
    - Import: BrowserRouter, Routes, Route from react-router-dom
    - Import: AuthProvider from features/auth/AuthContext
    - Import: LoginPage, AuthCallbackPage, DashboardPage
    - Import: ProtectedRoute from features/auth/ProtectedRoute
    - Structure:
      ```tsx
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      ```
    - AuthProvider wraps everything inside BrowserRouter (uses useNavigate)
    - DashboardPage stays as placeholder for Plan 2

    **Anti-patterns to avoid:**
    - Do NOT initialize auth status as false/null (causes flicker per Pitfall 1)
    - Do NOT use useNavigate in Axios interceptor (hooks can't be called outside components per Pitfall 6)
    - Do NOT redirect during loading state (ProtectedRoute renders null, not Navigate)
    - Do NOT use fetch() for OAuth redirect (must use window.location.href per AUTH-01)
    </action>
    <verify>
    <automated>cd frontend
# Check AuthContext structure
grep -q "'loading'" src/features/auth/AuthContext.tsx && echo "Loading state initialized"
grep -q "auth:logout" src/features/auth/AuthContext.tsx && echo "Logout event listener present"
grep -q "useAuth" src/features/auth/AuthContext.tsx && echo "useAuth hook exported"
# Check ProtectedRoute structure
grep -q "ProtectedRoute" src/features/auth/ProtectedRoute.tsx && echo "ProtectedRoute component present"
grep -q "Navigate" src/features/auth/ProtectedRoute.tsx && echo "Navigation redirect present"
grep -q "loading" src/features/auth/ProtectedRoute.tsx && echo "Loading state handled"
# Check App structure
grep -q "AuthProvider" src/App.tsx && echo "AuthProvider in App"
grep -q "ProtectedRoute" src/App.tsx && echo "ProtectedRoute in App"
</automated>
    </verify>
    <done>
    - AuthContext provides three-state auth management (loading/authenticated/unauthenticated)
    - AuthProvider validates token on bootstrap via /auth/verify
    - AuthContext listens for auth:logout events from Axios interceptor
    - ProtectedRoute renders null during loading, redirects when unauthenticated
    - App.tsx wraps routes with AuthProvider and ProtectedRoute
    - No auth flicker on page load (status initialized as 'loading')
    </done>
  </task>
</tasks>

<verification>
**Plan 2 verification checklist:**
1. Click "Sign in with Google" → redirects to backend OAuth flow
2. Backend callback redirects to /auth/callback?token=<jwt>
3. Token is stored in localStorage under key "meetmind_token"
4. URL is stripped of token (replaceState called)
5. /auth/verify is called and user lands on /
6. Refreshing page keeps user logged in (token validated on bootstrap)
7. Clearing localStorage and refreshing redirects to /login
8. Navigating to / without token redirects to /login
9. Simulating 401 (e.g., expired token) triggers redirect to /login exactly once
10. Login page matches UI-SPEC: wordmark, card, button, copy all correct
</verification>

<success_criteria>
**Measurable completion:**
- [ ] Login page displays "Sign in with Google" button with Google G icon
- [ ] Button click redirects to VITE_API_URL + /auth/google
- [ ] Auth callback reads token from URL, stores it, strips from history
- [ ] Token validation on bootstrap calls /auth/verify
- [ ] Auth state transitions: loading → authenticated OR loading → unauthenticated
- [ ] ProtectedRoute prevents unauthenticated access to /
- [ ] 401 response triggers single redirect to /login via auth:logout event
- [ ] No visible login flash on page refresh when authenticated
- [ ] UI matches UI-SPEC copywriting and spacing requirements
</success_criteria>

<output>
After completion, create `.planning/phases/01-project-foundation-and-auth/01-02-SUMMARY.md` documenting:
- Auth flow implementation details
- Any backend endpoint variations from research
- Token storage behavior confirmed
- Transition to Phase 2: Calendar Dashboard (requires valid JWT before /meetings calls)
</output>
