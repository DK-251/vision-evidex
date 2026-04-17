# Changelog — Vision-EviDex

All notable changes are documented here. Versions follow [SemVer](https://semver.org/).

## [Unreleased]

### Phase 0 — two-machine comms layer (2026-04-17)

- `STATUS.md` — auto-rewritten live pulse by `npm run report`
- `FEATURES.md` — 92 P0 feature checklist organized by module + ID
- `INBOX-TO-ASUS.md` and `INBOX-TO-CTS.md` — merge-safe async messaging
- `run-reports/history/` — per-run archive folder
- `run-reports/benchmarks.jsonl` — append-only trend data
- `ASUS-FIRST-RUN.md` — step-by-step playbook for the run machine
- `scripts/run-report.js` enhanced: git SHA + branch capture, history archive, STATUS rewrite, benchmarks append

### Phase 0 — scaffold (2026-04-17)

- Initial project scaffold: package.json, tsconfig, electron-vite 4-entry config, electron-builder dual-mode, Tailwind + PostCSS, ESLint + Prettier + Vitest
- Shared types, schemas, and IPC channel constants (`src/shared/`)
- 13 main-process service stubs (capture, session, evidex-container, database, export, metrics-import, licence, naming, manifest, settings, shortcut, tray, signoff)
- Main process shell (`app.ts`, `window-manager.ts`, `ipc-router.ts`, `window-config.ts`)
- contextBridge preload exposing `window.evidexAPI`
- 22 renderer page stubs + 3 auxiliary window entry points (toolbar, annotation, region)
- Design tokens (`tokens.css`) for light + dark themes
- 5 pre-built report template JSON stubs
- Scripts: `verify-setup.js`, `run-report.js`, `setup-asus.ps1`
- Root docs: `CLAUDE.md` (Appendix B template), `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, `BACKLOG.md`
