# WORKFLOW.md — Two-Machine Development Protocol

> **CTS laptop** = code authoring (Claude + filesystem connector). Cannot run `npm install`, `npm run dev`, or `npm test`.  
> **Asus TUF** = build/run machine. Runs all gates. Has VS Build Tools, node-gyp, Copilot, full build chain.

---

## The loop (always this order — never skip)

```
CTS writes code + spec fixes → git push
    ↓
Asus pulls + npm run report
    ↓
Asus writes result to GATE.md → git push
    ↓
CTS reads GATE.md → fix or advance
```

**Gate must be GREEN before any new feature work starts.**

---

## CTS responsibilities

1. Read `GATE.md` first. If RED, fix only the listed failures — nothing else.
2. When writing code that changes a type shape or function signature, also update the affected spec files in the same commit. Use `grep -r "TypeName" __tests__/` to find them.
3. Fill in `INBOX-TO-ASUS.md` before every push (see format below).
4. Keep `CLAUDE.md §1` to 4 lines (sprint name, gate status, now working on, blocked on).
5. Tick `FEATURES.md` checkboxes only after Asus confirms gate is GREEN.

## Asus responsibilities

1. After every CTS push: `git pull --ff-only && npm run report`.
2. Overwrite `GATE.md` with the structured result (see format below).
3. If tests fail and Copilot can produce a correct fix: apply it, commit with `[ASUS-FIX]` tag, push, then re-run `npm run report` to confirm green before writing GATE.md.
4. If Asus applies any fix to any source or spec file: record it in `ASUS-CHANGELOG.md` (see format below) AND in the git commit message.
5. Never start Phase N+1 feature work. Only run gates and apply test/type fixes.
6. Manual UI observations (things that can't be seen in `npm run report`) go in `INBOX-TO-CTS.md`.

---

## GATE.md — format Asus writes after every run

Asus **overwrites** this file. Do not append.

```markdown
# GATE.md — Latest gate result

**Date:** YYYY-MM-DD HH:MM
**Commit tested:** `abc1234`
**Result:** GREEN | RED

## Checks

| Check | Result | Detail |
|---|---|---|
| typecheck | PASS / FAIL | X errors if FAIL |
| tests | PASS / FAIL | X/Y passed |
| PBKDF2 | PASS / WARN | mean Xms max Yms budget 800ms |

## Failing tests (empty if GREEN)

\`\`\`
<paste exact vitest failure output — file:line, expected vs received>
\`\`\`

## Typecheck errors (empty if GREEN)

\`\`\`
<paste exact tsc error output — file:line, error message>
\`\`\`

## Actions taken by Asus

- [none] | [fixed X in Y — see ASUS-CHANGELOG.md]

## Next step

- GREEN → CTS: proceed to [Phase X Week Y / next task]
- RED   → CTS: fix [exact file list] before any new work
```

---

## ASUS-CHANGELOG.md — every file Asus touches

Asus **appends** to this file whenever it modifies any source or spec file.  
CTS reads this after every gate run to stay in sync.

```markdown
## [YYYY-MM-DD HH:MM] commit `abc1234` — one-line description

**Files changed:**

| File | What changed | Why |
|---|---|---|
| `__tests__/shortcut-service.spec.ts` | Updated HotkeyBindings mock shape | 6 fields after HK-01/HK-02 |
| `__tests__/ipc-router.spec.ts` | Added app/dialog/BrowserWindow to electron mock | FUI-4f regression |

**Confirmed green after fix:** YES / NO (describe if NO)
```

---

## INBOX-TO-ASUS.md — CTS fills before every push

Append at top. One entry per push. Concise.

```markdown
## [YYYY-MM-DD] <one-line description>

**Action:** git pull --ff-only && npm run report → write GATE.md

| Changed file | Impact on tests |
|---|---|
| `src/path/to/file.ts` | what changed |
| `__tests__/spec.spec.ts` | already updated in this commit |

**Likely RED specs (if any):**
1. `__tests__/X.spec.ts` — reason

**Expected result:** GREEN | may need spec fixes for [X]
```

---

## INBOX-TO-CTS.md — Asus fills for manual observations only

Append at top. Use for visual bugs, design questions, infra issues.  
**Do not use for gate results** — those go in GATE.md.

```markdown
## [YYYY-MM-DD HH:MM] <issue title>
**Type:** visual-bug | design-question | infra | manual-test
**Status:** OPEN | RESOLVED YYYY-MM-DD

<Two sentences: observed vs expected. For infra: exact error.>
```

---

## Anti-patterns

| What happened | Why it's bad | Fix |
|---|---|---|
| Type shape changed, spec not updated | Asus fails → CTS fixes → 2nd push wasted | Update spec in same commit as source |
| New feature pushed on RED gate | Failures pile up, hard to isolate | Gate GREEN first, always |
| Asus fixes tests but doesn't tell CTS | CTS re-applies a different fix → conflict | ASUS-CHANGELOG.md + `[ASUS-FIX]` commit tag |
| INBOX walls of prose | CTS must parse to find file names | Table format, file paths explicit |
| CLAUDE.md §1 becomes a sprint log | 60+ lines, unusable at-a-glance | 4 lines only |
| Gate results buried in INBOX-TO-CTS prose | CTS must read paragraphs to find pass/fail | GATE.md structured file |
