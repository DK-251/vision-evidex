# INBOX-TO-ASUS.md
*Instructions from CTS. Newest at top. Mark done with [DONE YYYY-MM-DD] after gate run.*

---

## [2026-05-15] P0 fixes from UX observation session

**Action:** `git pull --ff-only && npm run report` → overwrite `GATE.md` with result → push

| Changed file | Impact on tests |
|---|---|
| `src/main/services/session.service.ts` | `resolveHotkeyBindings` now calls `toElectronAccelerator()` on stored bindings (§20a). `toElectronAccelerator` import added at top of file. |
| `src/main/services/project.service.ts` | `open()` no-ops if file is already the active container (§20b). Existing `session-lifecycle` + `project-roundtrip` tests unaffected. |
| `src/shared/ipc-channels.ts` | New channel `SESSION_START_REGION_CAPTURE = 'session:startRegionCapture'`. Channel count increases by 1 → **`ipc-router.spec.ts` handler-count assertion will change**. |
| `src/main/ipc-router.ts` | Handler for `SESSION_START_REGION_CAPTURE` added. `createRegionWindow` imported. |
| `src/preload/preload.ts` | `session.startRegionCapture(sessionId)` added to preload bridge. |
| `src/toolbar/App.tsx` | Default tag changed `'untagged'` → `'pass'` (§15). Region button now calls `startRegionCapture` instead of `screenshot` (§13). |

**Likely RED spec:**

1. `__tests__/ipc-router.spec.ts` — line: `expect(handlers.size).toBe(Object.values(IPC).length)` — this is dynamic so it self-corrects. **Should stay GREEN** as long as the handler is registered.

**If RED, look at:**
- `__tests__/session-service.spec.ts` — if `resolveHotkeyBindings` is tested directly
- `__tests__/ipc-router.spec.ts` — if handler count or channel list is hardcoded

**Expected result:** GREEN — no shape changes, only new handler + logic fixes.

---

## [DONE 2026-05-15] Audit pass (72 fixes) + spec pre-fixes

Gate result: GREEN — 563/563. See GATE.md commit `97e4941`.

---
