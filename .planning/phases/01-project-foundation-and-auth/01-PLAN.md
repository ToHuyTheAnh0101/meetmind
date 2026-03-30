---
phase: 01-project-foundation-and-auth
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/vite.config.ts
  - frontend/tsconfig.json
  - frontend/index.html
  - frontend/src/main.tsx
  - frontend/src/App.tsx
  - frontend/src/index.css
  - frontend/src/vite-env.d.ts
  - frontend/src/lib/apiClient.ts
  - frontend/src/lib/tokenStorage.ts
  - frontend/.env
  - frontend/.env.example
  - frontend/components.json
  - frontend/package.json
autonomous: true
requirements:
  - SETUP-01
  - SETUP-02
  - SETUP-03
  - SETUP-04
  - SETUP-05
  - SETUP-06
must_haves:
  truths:
    - "Vite dev server runs on localhost:3001 and fails loudly if port is taken"
    - "Tailwind CSS v4 is configured via Vite plugin (no tailwind.config.js)"
    - "shadcn/ui is initialized with New York style, Neutral base, CSS variables enabled"
    - "TanStack Query wraps the app with QueryClientProvider"
    - "React Router defines routes: /login, /auth/callback, /"
    - "Axios instance has baseURL from VITE_API_URL and JWT interceptor"
  artifacts:
    - path: "frontend/vite.config.ts"
      provides: "Vite config with port 3001, strictPort, historyApiFallback"
      min_lines: 20
    - path: "frontend/src/lib/apiClient.ts"
      provides: "Axios instance with request/response interceptors"
      exports: ["apiClient"]
      min_lines: 25
    - path: "frontend/src/lib/tokenStorage.ts"
      provides: "Token storage utilities (getToken, setToken, clearToken, isTokenExpired)"
      exports: ["getToken", "setToken", "clearToken", "isTokenExpired"]
      min_lines: 15
    - path: "frontend/.env"
      provides: "VITE_API_URL=http://localhost:3000"
      contains: "VITE_API_URL=http://localhost:3000"
  key_links:
    - from: "frontend/src/lib/apiClient.ts"
      to: "frontend/src/lib/tokenStorage.ts"
      via: "import getToken, clearToken"
      pattern: "import.*from.*['\"]\.\/tokenStorage['\"]"
    - from: "frontend/src/main.tsx"
      to: "frontend/src/App.tsx"
      via: "QueryClientProvider wraps App"
      pattern: "QueryClientProvider.*<App />"
---

<objective>
Scaffold Vite + React + TypeScript project and configure all foundational tooling
</objective>

<purpose>
Establish the complete development environment for MeetMind frontend. This plan creates the project structure, configures build tooling, and wires up all libraries needed for authentication and data fetching. Without this foundation, no feature work can proceed.
</purpose>

<output>
- Vite project at `frontend/` running on port 3001
- Tailwind CSS v4 + shadcn/ui configured
- TanStack Query + React Router + Axios configured
- API client with JWT interceptor ready for auth implementation
</output>

<execution_context>
@/home/theanh/meetmind/.claude/get-shit-done/workflows/execute-plan.md
@/home/theanh/meetmind/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-project-foundation-and-auth/01-RESEARCH.md
@.planning/phases/01-project-foundation-and-auth/01-UI-SPEC.md
@.planning/REQUIREMENTS.md
@CLAUDE.md
</context>

<interfaces>
<!-- No existing interfaces — this plan creates the foundation -->
</interfaces>

<tasks>
  <task type="auto">
    <name>Task 1: Scaffold Vite project with TypeScript, Tailwind v4, and path aliases</name>
    <files>
    frontend/
    frontend/vite.config.ts
    frontend/tsconfig.json
    frontend/index.html
    frontend/src/main.tsx
    frontend/src/index.css
    frontend/src/vite-env.d.ts
    frontend/.env
    frontend/.env.example
    </files>
    <action>
    **Step 1: Create Vite project**
    - Run: `npm create vite@latest frontend -- --template react-ts`
    - This creates the base React + TypeScript scaffold
    - cd into frontend and run `npm install`

    **Step 2: Add dependencies**
    - Tailwind: `npm install -D tailwindcss @tailwindcss/vite`
    - Router: `npm install react-router-dom`
    - Data layer: `npm install @tanstack/react-query axios`
    - Utilities: `npm install class-variance-authority clsx tailwind-merge lucide-react`
    - Types (dev): `npm install -D @types/react @types/react-dom`

    **Step 3: Configure Vite (frontend/vite.config.ts)**
    - Import `@tailwindcss/vite` plugin
    - Set `server.port = 3001`
    - Set `server.strictPort = true` (fail if 3001 taken, don't silently move to 3002)
    - Set `server.historyApiFallback = true` (SPA routes on refresh)
    - Pattern from RESEARCH.md Pattern 1

    **Step 4: Configure Tailwind v4 (frontend/src/index.css)**
    - Replace contents with: `@import "tailwindcss";`
    - No tailwind.config.js needed in v4 — auto-detection is built in

    **Step 5: Configure TypeScript path aliases (frontend/tsconfig.json)**
    - Add `baseUrl: "."` and `paths: { "@/*": ["src/*"] }` under compilerOptions
    - shadcn/ui requires these aliases for component imports

    **Step 6: Type environment variables (frontend/src/vite-env.d.ts)**
    - Augment ImportMetaEnv interface:
      ```typescript
      interface ImportMetaEnv {
        readonly VITE_API_URL: string;
      }
      interface ImportMeta {
        readonly env: ImportMetaEnv;
      }
      ```

    **Step 7: Create environment files**
    - `.env`: `VITE_API_URL=http://localhost:3000`
    - `.env.example`: Same content with comment `# Replace with your backend URL`

    **Step 8: Update index.html**
    - Add Inter font preload: `<link rel="preconnect" href="https://fonts.googleapis.com">`
    - Add Inter font: `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">`
    - Update title to "MeetMind"

    **Anti-patterns to avoid:**
    - Do NOT create tailwind.config.js (v4 uses plugin, not postcss config)
    - Do NOT use fetch() pattern — we need window.location.href for OAuth (will be used in Task 2)
    - Do NOT set server.port to anything other than 3001 (backend CORS is locked to this port per SETUP-02)
    </action>
    <verify>
    <automated>cd frontend && npm run dev &
sleep 3
curl -s http://localhost:3001 | grep -q "MeetMind" && pkill -f "vite" && echo "Vite server starts on port 3001 with MeetMind title"
</automated>
    </verify>
    <done>
    - Vite project created at frontend/
    - Dev server starts on localhost:3001 with strictPort
    - Tailwind CSS v4 configured via Vite plugin
    - Path aliases configured (@/* -> src/*)
    - Environment variables typed and documented
    - Inter font loaded in index.html
    </done>
  </task>

  <task type="auto">
    <name>Task 2: Initialize shadcn/ui and configure React Router + TanStack Query + Axios</name>
    <files>
    frontend/components.json
    frontend/src/App.tsx
    frontend/src/main.tsx
    frontend/src/lib/apiClient.ts
    frontend/src/lib/tokenStorage.ts
    </files>
    <action>
    **Step 1: Initialize shadcn/ui**
    - Run: `npx shadcn init`
    - Interactive prompts (answer exactly):
      - Style: New York
      - Base color: Neutral
      - CSS variables: Yes
    - This creates components.json and configures tailwindcss
    - Add shadcn components: `npx shadcn add button card`

    **Step 2: Create API client (frontend/src/lib/apiClient.ts)**
    - Create axios instance with baseURL from `import.meta.env.VITE_API_URL`
    - Request interceptor: Add `Authorization: Bearer ${token}` header if token exists
    - Response interceptor: Catch 401 errors, clear token, dispatch `auth:logout` event
    - Use single-fire guard flag (`isRedirecting`) to prevent multiple simultaneous redirects
    - Pattern from RESEARCH.md Pattern 4

    **Step 3: Create token storage (frontend/src/lib/tokenStorage.ts)**
    - Export functions: `getToken()`, `setToken(token)`, `clearToken()`
    - Implement `isTokenExpired(token)` using JWT payload decode (atob on split('.')[1])
    - Key: `meetmind_token` in localStorage
    - Pattern from RESEARCH.md Pattern 5

    **Step 4: Set up TanStack Query (frontend/src/main.tsx)**
    - Create QueryClient instance
    - Wrap App with QueryClientProvider
    - Keep StrictMode enabled
    - Pattern from RESEARCH.md Pattern 10

    **Step 5: Configure React Router (frontend/src/App.tsx)**
    - Import BrowserRouter, Routes, Route
    - Define routes:
      - `/login` -> LoginPage (placeholder for now, just "Login Page" text)
      - `/auth/callback` -> AuthCallbackPage (placeholder, just "Callback" text)
      - `/` -> DashboardPage (placeholder, just "Dashboard" text)
    - These are stubs — full implementation happens in Plan 2
    - Pattern from RESEARCH.md Pattern 9

    **Step 6: Create placeholder components**
    - src/features/auth/LoginPage.tsx: Export component with "Login Page" text
    - src/features/auth/AuthCallbackPage.tsx: Export component with "Callback" text
    - src/features/dashboard/DashboardPage.tsx: Export component with "Dashboard" text
    - These stubs verify the routing works; actual UI comes in Plan 2
    </action>
    <verify>
    <automated>cd frontend && npm run dev &
sleep 3
# Check shadcn components exist
test -f src/components/ui/button.tsx && test -f src/components/ui/card.tsx && echo "shadcn components created"
# Check lib files exist
test -f src/lib/apiClient.ts && test -f src/lib/tokenStorage.ts && echo "API client and token storage created"
# Check routes are defined
grep -q "react-router-dom" src/App.tsx && grep -q "Routes" src/App.tsx && echo "React Router configured"
pkill -f "vite"
</automated>
    </verify>
    <done>
    - shadcn/ui initialized with New York style, Neutral base, CSS variables
    - Button and Card components available
    - Axios instance with JWT interceptor at src/lib/apiClient.ts
    - Token storage utilities at src/lib/tokenStorage.ts
    - TanStack Query wraps the app
    - React Router configured with /login, /auth/callback, / routes
    - Placeholder components exist to verify routing works
    </done>
  </task>
</tasks>

<verification>
**Plan 1 verification checklist:**
1. `cd frontend && npm run dev` starts without errors
2. Dev server is on port 3001 (check terminal output or curl http://localhost:3001)
3. App loads in browser showing placeholder pages
4. `components.json` exists (shadcn initialized)
5. `src/components/ui/button.tsx` and `card.tsx` exist
6. `src/lib/apiClient.ts` exports apiClient with interceptors
7. `src/lib/tokenStorage.ts` exports all 4 functions
8. `src/App.tsx` has BrowserRouter with 3 routes
9. `.env` has VITE_API_URL=http://localhost:3000
</verification>

<success_criteria>
**Measurable completion:**
- [ ] Vite dev server runs on localhost:3001 (strictPort enforced)
- [ ] Tailwind CSS utility classes work in components
- [ ] shadcn Button and Card components can be imported and rendered
- [ ] Axios instance has request interceptor that adds Authorization header
- [ ] Axios instance has response interceptor that handles 401
- [ ] Token storage module provides getToken, setToken, clearToken, isTokenExpired
- [ ] React Router navigates between /login, /auth/callback, / placeholders
- [ ] All imports use @/ path alias (no relative imports like ../../)
</success_criteria>

<output>
After completion, create `.planning/phases/01-project-foundation-and-auth/01-01-SUMMARY.md` documenting:
- Final project structure
- Library versions installed
- Any deviations from planned approach
- Token for Plan 2: "ApiClient and tokenStorage are ready; AuthContext will import from these"
</output>
