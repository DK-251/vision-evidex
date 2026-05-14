# INBOX-TO-ASUS.md
*Instructions from CTS. Newest at top. Mark done with [DONE YYYY-MM-DD] after gate run.*

---

## [2026-05-14] Audit pass (72 fixes) + pre-emptive spec updates

**Action:** `git pull --ff-only && npm run report` → overwrite `GATE.md` with result → push

| Changed file | Test impact |
|---|---|
| `src/main/services/shortcut.service.ts` | HotkeyBindings: 6 fields, `captureWindow` → `captureActiveWindow`, constructor shape `{ callbacks }` |
| `src/renderer/stores/nav-store.ts` | `project-overview` no longer clears `currentSessionId` |
| `src/shared/types/entities.ts` | `Settings` has `defaultExportPath` + `environments`; `SessionStatus` has optional `testId` |
| `src/main/services/database.service.ts` | `insertCapture` writes `tester_name`; `mapCapture` reads it |
| `src/main/migrations/002_captures_tester_name.ts` | New migration — runs idempotently via `initProjectSchema()` |
| `src/shared/types/ipc.ts` | New error code `STORAGE_LIMIT_EXCEEDED` |
| `__tests__/shortcut-service.spec.ts` | **CTS already updated** — full rewrite for 6-binding shape |
| `__tests__/nav-store.spec.ts` | **CTS already updated** — NAV-NEW-01 tests added |
| `__tests__/settings-service.spec.ts` | **CTS already updated** — new fields in toMatchObject assertions |

**Expected result:** GREEN. CTS pre-fixed all likely failing specs. If still RED, Asus should fix per GATE.md errors, log to ASUS-CHANGELOG.md, and re-run before writing GATE.md.

---
