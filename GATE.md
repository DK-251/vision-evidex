# GATE.md — Latest gate result

> **Asus TUF overwrites this file after every `npm run report`. CTS reads this before writing any code.**  
> For the full workflow, see [WORKFLOW.md](WORKFLOW.md).

---

**Date:** 2026-05-15 08:53 (last gate) → PENDING new gate for P0 fixes
**Commit tested:** `97e4941` (last GREEN) | new commit: pending push
**Result:** PENDING

## Last GREEN checks (commit `97e4941`)

| Check | Result | Detail |
|---|---|---|
| typecheck | PASS | — |
| tests | PASS | 563/563 |
| PBKDF2 | PASS | mean 93ms, max 94ms, budget 800ms |

## Changes since last gate (P0 fixes — CTS)

| File | Change |
|---|---|
| `src/main/services/session.service.ts` | `resolveHotkeyBindings` now converts stored `Ctrl+` → `CmdOrCtrl+` via `toElectronAccelerator` |
| `src/main/services/project.service.ts` | `open()` no-ops if same file already open (§20b) |
| `src/shared/ipc-channels.ts` | New channel `SESSION_START_REGION_CAPTURE` |
| `src/main/ipc-router.ts` | Handler for new channel added |
| `src/preload/preload.ts` | `session.startRegionCapture` exposed |
| `src/toolbar/App.tsx` | Default tag `'pass'`; region button uses `startRegionCapture` |

## Next step

**Asus:** `git pull --ff-only && npm run report` → overwrite this file → push.
