# ASUS-CHANGELOG.md
*Every file Asus modifies gets logged here. Append-only. CTS reads this after every gate run.*

*Format: date, commit hash, table of files changed, confirmation of green.*

---

## [2026-05-15 13:37] commit `676a6134` — UX fix pass gate run (563 tests GREEN)

**Files changed:** none — report was GREEN immediately, no fixes required.

**Confirmed green:** YES — typecheck PASS, 563/563 tests PASS, PBKDF2 mean 167ms.

---

## [2026-05-15 08:53] commit `97e4941` — audit pass gate fix (563 tests GREEN)

**Files changed:**

| File | What changed | Why |
|---|---|---|
| `__tests__/session-service.spec.ts` | `ShortcutService({ onCapture, ... })` → `ShortcutService({ callbacks: { onCapture }, ... })`; `getCurrentBindings()` assertion updated to 6-field shape with `captureActiveWindow` replacing `captureWindow` | Constructor shape changed in audit pass; old spec was stale |
| `__tests__/integration.session-lifecycle.spec.ts` | Same `{ callbacks: { onCapture: vi.fn() } }` constructor fix | Same root cause |
| `__tests__/integration.project-roundtrip.spec.ts` | Same constructor fix | Same root cause |
| `src/renderer/onboarding/hotkey-utils.ts` | `formatKeyEvent`: split `if (ctrlKey \|\| metaKey)` into `if (ctrlKey)` + `if (metaKey)` to output `Meta` as separate modifier | Test expected `Ctrl+Alt+Shift+Meta+F`; function was collapsing both into `Ctrl` |
| `src/renderer/pages/SessionGalleryPage.tsx` | Moved `isActive`/`displayCaptures` declarations before `counts` useMemo | TS2448: used before declaration |
| `src/renderer/stores/nav-store.ts` | Removed `project-list` from `isProjectPage` set | `project-list` must clear `currentSessionId`; test `pre-w9-gap-coverage` asserted this |
| `src/toolbar/App.tsx` | `setStatus` call: conditional spread for `testId` instead of direct assignment | TS2345: `exactOptionalPropertyTypes` — `string \| undefined` not assignable to `?: string` |

**Confirmed green after fix:** YES — `npm run report` PASS, typecheck PASS, 563/563 tests, PBKDF2 mean 93ms.

---

## [2026-05-05 07:00] commit `4920e56` — Wk8 gate regression hotfix

**Files changed:**

| File | What changed | Why |
|---|---|---|
| `src/main/services/project.service.ts` | Import `ProjectCreateInput` from `@shared/schemas` not `@shared/types/entities` | Type not exported from entities |
| `src/renderer/stores/project.store.ts` | Same import fix | Same |
| `src/shared/types/entities.ts` | Added `project_create` to `AccessEventType` | Missing value causing TS error |
| `src/renderer/pages/CreateProjectPage.tsx` | Conditional spread for `projectName`/`clientName` in preview payload | exactOptionalPropertyTypes TS error |
| `__tests__/integration.project-roundtrip.spec.ts` | Replaced brittle hardcoded PNG bytes with `sharp(...).png().toBuffer()` | Test was providing raw RGBA to Sharp, which requires encoded input |

**Confirmed green after fix:** YES — `npm run report` PASS, typecheck PASS, 327/327 tests.

---

## [2026-04-23 07:15] commit applied locally — CaptureService test fix

**Files changed:**

| File | What changed | Why |
|---|---|---|
| `__tests__/capture-service.spec.ts` | Changed `makeRawBuffer()` from `.raw().toBuffer()` to `.png().toBuffer()` | Sharp expects PNG/JPEG not raw RGBA pixels |

**Confirmed green after fix:** YES — 203/203 tests.

---

## [2026-04-19 09:29] commit applied locally — FUI-4f electron mock fix

**Files changed:**

| File | What changed | Why |
|---|---|---|
| `__tests__/ipc-router.spec.ts` | Added `app: { isPackaged: false }`, `dialog`, `BrowserWindow`, `nativeTheme` to `vi.mock('electron')` factory | `window-config.ts` imports `app.isPackaged` at module load; mock was missing it |

**Confirmed green after fix:** YES — 189/189 tests.

---

## [2026-04-19 08:47] commit applied locally — FUI-4e UserProfileStep strict optional fix

**Files changed:**

| File | What changed | Why |
|---|---|---|
| `src/renderer/onboarding/UserProfileStep.tsx` | Conditional build of `patchRaw` payload — `customRole` only included when defined | TS2379 exactOptionalPropertyTypes violation |

**Confirmed green after fix:** YES — 189/189 tests.

---

## [2026-04-19 19:49] commit applied locally — FUI-4b/4c/4d icon type fix

**Files changed:**

| File | What changed | Why |
|---|---|---|
| `src/renderer/pages/OnboardingPage.tsx` | Changed `FluentIcon` alias to use `FluentIconsProps` from `@fluentui/react-icons` | TS2322 — local alias narrowed `fontSize` type incorrectly under exactOptionalPropertyTypes |

**Confirmed green after fix:** YES — 189/189 tests.

---
