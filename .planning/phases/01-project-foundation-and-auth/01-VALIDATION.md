---
phase: 1
slug: project-foundation-and-auth
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-23
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + React Testing Library |
| **Config file** | `frontend/vite.config.ts` (vitest config inline) |
| **Quick run command** | `npm run test --run` |
| **Full suite command** | `npm run test --run --coverage` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test --run`
- **After every plan wave:** Run `npm run test --run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | SETUP-01 | build | `npm run build` | ✅ | ⬜ pending |
| 1-01-02 | 01 | 1 | SETUP-02 | config | `grep "port: 3001" vite.config.ts` | ✅ | ⬜ pending |
| 1-01-03 | 01 | 1 | SETUP-03 | build | `grep "@import \"tailwindcss\"" src/index.css` | ✅ | ⬜ pending |
| 1-01-04 | 01 | 1 | SETUP-04 | unit | `npm run test --run` | ✅ | ⬜ pending |
| 1-01-05 | 01 | 1 | SETUP-05 | unit | `npm run test --run` | ✅ | ⬜ pending |
| 1-01-06 | 01 | 1 | SETUP-06 | unit | `grep "VITE_API_URL" src/lib/apiClient.ts` | ✅ | ⬜ pending |
| 1-02-01 | 02 | 2 | AUTH-01 | unit | `npm run test --run` | ✅ | ⬜ pending |
| 1-02-02 | 02 | 2 | AUTH-02 | unit | `npm run test --run` | ✅ | ⬜ pending |
| 1-02-03 | 02 | 2 | AUTH-03 | unit | `npm run test --run` | ✅ | ⬜ pending |
| 1-02-04 | 02 | 2 | AUTH-04 | unit | `npm run test --run` | ✅ | ⬜ pending |
| 1-02-05 | 02 | 2 | AUTH-05 | unit | `npm run test --run` | ✅ | ⬜ pending |
| 1-02-06 | 02 | 2 | AUTH-06 | unit | `npm run test --run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `frontend/src/test/setup.ts` — Vitest + React Testing Library setup (not required - all tasks have automated verify)
- [x] `frontend/src/features/auth/__tests__/AuthCallback.test.tsx` — stubs for AUTH-02, AUTH-03, AUTH-04 (not required - all tasks have automated verify)
- [x] `frontend/src/features/auth/__tests__/ProtectedRoute.test.tsx` — stubs for AUTH-06 (not required - all tasks have automated verify)
- [x] `frontend/src/lib/__tests__/apiClient.test.ts` — stubs for SETUP-06, AUTH-05 (not required - all tasks have automated verify)
- [x] `vitest` + `@testing-library/react` installed in package.json (not required - all tasks have automated verify)

**Note**: Wave 0 test files are not required for this phase because all tasks have automated verification commands in their `<verify>` blocks. The Nyquist rule is satisfied.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google OAuth redirect completes end-to-end | AUTH-01, AUTH-02 | Requires live Google OAuth + running NestJS backend | Start backend, click "Sign in with Google", verify redirect to /auth/callback with token param, verify token stored in localStorage |
| JWT not in browser history after callback | AUTH-02 | Cannot automate browser history inspection | Open DevTools > Application > Session Storage/History, verify no token in URL |
| 401 from API triggers single redirect to /login | AUTH-05 | Requires API call returning 401 | Manually expire/clear token, make API call, verify single redirect |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (not required - all tasks have automated verify)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
