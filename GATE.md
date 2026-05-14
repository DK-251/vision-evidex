# GATE.md — Latest gate result

> **Asus TUF overwrites this file after every `npm run report`. CTS reads this before writing any code.**  
> For the full workflow, see [WORKFLOW.md](WORKFLOW.md).

---

**Date:** 2026-05-14 (pre-run — audit pass not yet gated)
**Commit tested:** `pending — audit pass + spec fixes pushed by CTS`
**Result:** PENDING

## Checks

| Check | Result | Detail |
|---|---|---|
| typecheck | PENDING | — |
| tests | PENDING | — |
| PBKDF2 | PENDING | last known: mean 143ms, max 158ms, budget 800ms |

## Failing tests

*(gate not yet run)*

## Typecheck errors

*(gate not yet run)*

## Actions taken by Asus

- [none yet]

## What CTS pre-fixed in this commit (no Asus action needed for these)

| Spec file | What was updated |
|---|---|
| `__tests__/shortcut-service.spec.ts` | Full rewrite — 6-field HotkeyBindings, new `callbacks` constructor shape, captureActiveWindow (not captureWindow), 6 accelerators registered when all callbacks given, 3 when capture-only |
| `__tests__/nav-store.spec.ts` | Added NAV-NEW-01 describe block — project-overview preserves sessionId; dashboard/settings clear it |
| `__tests__/settings-service.spec.ts` | Updated `toMatchObject` assertions to include `defaultExportPath: ''` and `environments: []` |

## Next step

**Asus:** `git pull --ff-only && npm run report` → overwrite this file with structured result → push.

**CTS (if GREEN):** Proceed to Phase 3 Week 11 — Template Engine.

**CTS (if RED):** Read exact errors above. Fix only listed files. Do not start Phase 3.
