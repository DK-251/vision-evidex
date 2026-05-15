# INBOX-TO-ASUS.md
*Instructions from CTS. Newest at top. Mark done with [DONE YYYY-MM-DD] after gate run.*

---

## [DONE 2026-05-15] All 14 remaining UX observations fixed + premium UX redesign

**Action:** `git pull --ff-only && npm run report` → overwrite `GATE.md` → push

| Changed file | Impact on tests |
|---|---|
| `src/main/services/session.service.ts` | `SessionWindowControls` interface: new optional `getAllWindows` field |
| `src/shared/ipc-channels.ts` | 2 new channels: `SESSION_START_REGION_CAPTURE`, `SESSION_ENDED` |
| `src/main/ipc-router.ts` | Handler for `SESSION_START_REGION_CAPTURE` added (count +1) |
| `src/preload/preload.ts` | `session.startRegionCapture` + `events.onSessionEnded` added |
| All renderer pages | UI-only changes, no IPC shape changes |

**Likely RED specs (if any):**
1. `__tests__/ipc-router.spec.ts` — handler count is `Object.values(IPC).length` (dynamic), self-corrects
2. `__tests__/session-service.spec.ts` — `getAllWindows` is optional, existing tests unaffected

**Expected result:** GREEN

---

## [DONE 2026-05-15] P0 fixes — §20a hotkey conversion + §20b double-open + §13 region + §15 default tag

Gate result: GREEN — gated on Asus, waiting for this gate.

---

## [DONE 2026-05-15] Audit pass (72 fixes) + spec pre-fixes

Gate result: GREEN — 563/563. See GATE.md commit `97e4941`.

---
