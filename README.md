# Vision-EviDex

Offline-first, Windows-first enterprise desktop application for QA teams to capture evidence, manage test documentation, and produce audit-ready reports.

## Status

**Phase 0 — Scaffold.** This repository is the initial project scaffold. No features are implemented yet. See `CLAUDE.md` for the current sprint focus and `run-reports/latest.md` for latest smoke-test status.

## Quick Start

Two-machine workflow. The **CTS Laptop** authors code. The **Asus TUF Run Machine** installs, builds, and runs the Electron app.

### Asus TUF Run Machine (first-time setup)

```powershell
git clone https://github.com/DK-251/vision-evidex.git
cd vision-evidex
powershell -ExecutionPolicy Bypass -File scripts\setup-asus.ps1
```

`setup-asus.ps1` checks Node, Git, and VS Build Tools — installs what is missing — then runs `npm install` and `npx electron-rebuild`.

### Day-to-day on Asus TUF

```bash
git pull
npm install            # only if package.json changed
npx electron-rebuild   # only if native deps changed
npm run dev            # launches the app
npm run report         # runs smoke tests → run-reports/latest.md
git add run-reports/ && git commit -m "chore: run report" && git push
```

### CTS Laptop (code authoring)

Do **not** run `npm install` or `npm run dev` on the CTS laptop — corporate SSL breaks `node-gyp`. Pull, read `run-reports/latest.md`, author code, push. The Asus TUF handles all builds.

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
