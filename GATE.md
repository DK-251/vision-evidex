# GATE.md — Latest gate result

> **Asus TUF overwrites this file after every `npm run report`. CTS reads this before writing any code.**  
> For the full workflow, see [WORKFLOW.md](WORKFLOW.md).

---

**Date:** 2026-05-15 08:53
**Commit tested:** `97e4941`
**Result:** GREEN

## Checks

| Check | Result | Detail |
|---|---|---|
| typecheck | PASS | — |
| tests | PASS | 563/563 passed |
| PBKDF2 | PASS | mean 93ms, max 94ms, budget 800ms |

## Failing tests

*(none)*

## Typecheck errors

*(none)*

## Actions taken by Asus

- Fixed `__tests__/session-service.spec.ts` — `ShortcutService` constructor updated to `{ callbacks: { onCapture } }` shape; `getCurrentBindings()` assertion updated to 6-field `HotkeyBindings` including `captureActiveWindow` (not `captureWindow`)
- Fixed `__tests__/integration.session-lifecycle.spec.ts` — same `{ callbacks: { onCapture: vi.fn() } }` constructor fix
- Fixed `__tests__/integration.project-roundtrip.spec.ts` — same constructor fix
- Fixed `src/renderer/onboarding/hotkey-utils.ts` — `formatKeyEvent` now pushes `Meta` separately after `Shift` (was merged with `ctrlKey`)
- Fixed `src/renderer/pages/SessionGalleryPage.tsx` — moved `isActive`/`displayCaptures` declarations before `counts` useMemo to resolve TS2448 (used before declaration)
- Fixed `src/renderer/stores/nav-store.ts` — removed `project-list` from `isProjectPage` so navigating to it clears `currentSessionId`
- Fixed `src/toolbar/App.tsx` — `setStatus` call uses conditional spread for `testId` to satisfy `exactOptionalPropertyTypes`
- See ASUS-CHANGELOG.md for full details

## Next step

**CTS:** GREEN — proceed to Phase 3 Week 11 — Template Engine.
