# Contributing — Vision-EviDex

## Two-machine workflow

| Machine | Role |
|---|---|
| CTS Laptop | Code authoring only. VS Code + Claude Code. Never runs `npm run dev`. |
| Asus TUF (Windows 11) | Pulls feature branches, runs `npm install`, `npx electron-rebuild`, `npm run dev`, `npm run report`. Never edits source. |

## Branches

- `main` — protected. Merges land only when the latest run report on the target branch is fully PASS (or only SKIP for unimplemented modules).
- `feature/<short-name>` — new feature work (one sprint or smaller).
- `fix/<short-name>` — bug fixes.

Never push directly to `main`. Always open a PR.

## Commit message format

```
[MODULE] type: description

  [MODULE]  one of: CAPTURE, SESSION, PROJECT, TEMPLATE, REPORT, EXPORT,
                    METRICS, LICENCE, AUDIT, SIGNOFF, SETTINGS, UI, CORE,
                    BUILD, DOCS, CHORE
  type      feat | fix | refactor | docs | test | chore | perf
```

Example: `[CAPTURE] feat: add SHA-256 hashing before JPEG compression`

## Run report ownership

`run-reports/latest.md` and `run-reports/latest.json` are authored **only** by the Asus TUF. These files are listed in `.gitattributes` with `merge=ours` — on any merge conflict, Asus's version always wins.

Never hand-edit these files on the CTS laptop.

## CLAUDE.md maintenance

`CLAUDE.md` is read at the start of every Claude Code session. Keep under 2,000 tokens. Update **Section 1** at sprint start, **Section 8** from `run-reports/latest.md` after every run, and **Section 9 (Locked decisions)** whenever a new binding decision is made.

## Architectural rules

The 12 rules in `CLAUDE.md` Section 4 are non-negotiable. A PR that violates any of them is rejected regardless of feature value. When in doubt, reference the rule and ask for an explicit exception before coding.

## Code style

Enforced automatically:

```bash
npm run typecheck
npm run lint
npm run format
```

Run these locally before pushing. The Asus TUF treats lint/typecheck errors as run-report FAIL.
