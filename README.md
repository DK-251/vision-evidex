# Vision-EviDex

Offline-first, Windows-first enterprise desktop application for QA teams to capture evidence, manage test documentation, and produce audit-ready reports.

## Status

**Phase 0 — Scaffold.** This repository is the initial project scaffold. No features are implemented yet.

**Live status:** [STATUS.md](STATUS.md) — auto-rewritten by the Asus TUF after every `npm run report`.

**What to read first:**
- [STATUS.md](STATUS.md) — one-glance pulse: phase, last run, module pass/fail, feature progress
- [CLAUDE.md](CLAUDE.md) — developer reference, architectural rules, current sprint focus
- [FEATURES.md](FEATURES.md) — 92 P0 feature checklist by module
- [run-reports/latest.md](run-reports/latest.md) — most recent smoke-test result
- [INBOX-TO-CTS.md](INBOX-TO-CTS.md) / [INBOX-TO-ASUS.md](INBOX-TO-ASUS.md) — cross-machine messages

## Quick Start

Two-machine workflow. The **CTS Laptop** authors code. The **Asus TUF Run Machine** installs, builds, and runs the Electron app.

### Asus TUF Run Machine (first-time setup)

Full step-by-step with prerequisites and troubleshooting: [ASUS-FIRST-RUN.md](ASUS-FIRST-RUN.md).

TL;DR:

```powershell
git clone https://github.com/DK-251/vision-evidex.git
cd vision-evidex
git config user.name "Deepak Sahu"
git config user.email "deepak.sahu4@cognizant.com"
copy .env.example .env
powershell -ExecutionPolicy Bypass -File scripts\setup-asus.ps1
npm run dev           # confirm Phase 0 scaffold card renders
npm run report        # first run report
git add run-reports/ STATUS.md && git commit -m "chore: first Asus run" && git push
```

### Day-to-day on Asus TUF

```bash
git pull
npm install                # only if package.json changed
npx electron-rebuild       # only if native deps changed
npm run dev                # launches the app
npm run report             # writes run-reports/latest.{md,json} + STATUS.md
git add run-reports/ STATUS.md && git commit -m "chore: run report" && git push
```

### CTS Laptop (code authoring)

Do **not** run `npm install` or `npm run dev` on the CTS laptop — corporate SSL breaks `node-gyp`. The day-to-day is:

```bash
git pull
# read STATUS.md → run-reports/latest.md → INBOX-TO-CTS.md
# author code, address FAIL items first
git add -- <files>
git commit -m "[MODULE] type: message"
git push
```

## Two-machine communication layer

| File | Who writes | Who reads | Purpose |
|---|---|---|---|
| [STATUS.md](STATUS.md) | Asus (auto) | Both | Live pulse — one-glance state |
| [run-reports/latest.md](run-reports/latest.md) | Asus (auto) | CTS | Detailed human-readable report |
| [run-reports/latest.json](run-reports/latest.json) | Asus (auto) | Both | Machine-readable; consumed by tooling |
| [run-reports/history/](run-reports/history/) | Asus (auto) | Both | Archived past runs |
| [run-reports/benchmarks.jsonl](run-reports/benchmarks.jsonl) | Asus (auto) | Both | One-line-per-run trend data |
| [FEATURES.md](FEATURES.md) | CTS | Both | 92 P0 feature checklist; Asus validates |
| [INBOX-TO-ASUS.md](INBOX-TO-ASUS.md) | CTS | Asus | CTS requests for the run machine |
| [INBOX-TO-CTS.md](INBOX-TO-CTS.md) | Asus | CTS | Asus findings, errors, failures |
| [BACKLOG.md](BACKLOG.md) | Both | Both | Ideas and discovered work |

## Documentation

Full product docs live outside the repo in `../Docs/` and `../Docs MD/`:

1. Vision Document
2. Architecture
3. Tech Spec
4. PRD (features + acceptance criteria)
5. Pre-mortem (38 catalogued risks)
6. Development Plan (26-week phase plan)

## Architecture (tl;dr)

- **Stack:** Electron 30 · React 18 · TypeScript 5.5 (strict) · Vite (4 entry points: main, toolbar, annotation, region) · better-sqlite3 · sharp · Fabric.js 5.3.0 · Framer Motion · Zustand · Zod · Tailwind CSS
- **Container:** every project is a `.evidex` file — AES-256-GCM encrypted ZIP holding SQLite + images, 20 MB cap, atomic writes
- **Security:** SHA-256 integrity hashing (computed on raw bytes before JPEG compression), PBKDF2-SHA256 310k iterations, immutable sign-off + access log + version history
- **Offline-first:** exactly one network call ever — Keygen.sh licence activation — and only in standard mode. Enterprise mode has zero outbound traffic.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Launch the app in dev mode (Asus TUF only) |
| `npm run build` | Produce production bundles under `out/` |
| `npm run dist:standard` | Build MSI with Keygen.sh activation enabled |
| `npm run dist:enterprise` | Build MSI with no licence activation |
| `npm run verify-setup` | Sanity-check local environment |
| `npm run report` | Generate `run-reports/latest.md` + `latest.json` |
| `npm run typecheck` | TypeScript validation across app + build configs |
| `npm run lint` | ESLint across `src/` |
| `npm run test` | Vitest test suite |

## Licence

UNLICENSED — internal, confidential.
