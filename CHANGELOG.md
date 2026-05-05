# Changelog — Vision-EviDex

All notable changes are documented here. Versions follow [SemVer](https://semver.org/).

## [Unreleased]

### Phase 2 Week 7 — D32–D35: capture pipeline plumbing (2026-05-05)

- `ShortcutService` (`src/main/services/shortcut.service.ts`) — global hotkey register/unregister, `SHORTCUT_CONFLICT` guard with rollback on partial registration, dual-unregister on `app.will-quit`. 9 tests.
- `SessionService` (`src/main/services/session.service.ts`) — `create` / `end` / `get` / `getActive` / `getAll` / `hasActiveSession`. **Architectural Rule 8 closed**: `EvidexContainerService.save()` is called on every session end. `SESSION_ALREADY_ACTIVE` / `SESSION_NOT_FOUND` / `SESSION_NOT_ACTIVE` guards. 11 tests.
- `EvidexErrorCode` extensions: `SHORTCUT_CONFLICT` added (`SESSION_NOT_ACTIVE` already existed). `EvidexErrorCode` count goes from a stale "27" comment to the accurate **32**.
- `SESSION_GET` IPC channel added end-to-end: channel constant + Zod schema + router handler + `window.evidexAPI.session.get()` on the preload bridge.
- `CAPTURE_SCREENSHOT` IPC handler wired (was stub) — session active-guard, dispatch to `CaptureService.screenshot()`, push `SESSION_STATUS_UPDATE` + `CAPTURE_FLASH` to all windows, `STORAGE_WARNING` push at ≥75 % of the 20 MiB project budget.
- `CAPTURE_TAG_UPDATE` IPC handler wired (was stub) — calls `CaptureService.updateTag()` (newly added; lightweight DB-only update, container saved on next session end).
- `electronCaptureSource` (`src/main/services/electron-capture-source.ts`) — `desktopCapturer`-backed `CaptureSource`, region-mode crop via sharp before the buffer reaches `CaptureService` so Rule 7 still holds.
- D35 `SessionLookup` adapter in `app.ts` — closes the renderer/main loop. `projectName`/`clientName` stubbed `'Pre-Wk8 …'` until Project-open lands; `containerId` resolves to `'NO_CONTAINER'` sentinel when no container is open.
- Hotkey callback wired in `app.ts` — `ShortcutService.onCapture` now invokes the real capture pipeline + broadcasts; failures are logged but never thrown out of the `globalShortcut` callback.
- `session.store.ts` (`src/renderer/stores/session.store.ts`) — Zustand session + capture state, optimistic tag updates with revert on error.
- `SessionIntakeModal` (`src/renderer/components/modals/SessionIntakeModal.tsx`) — 560 px modal, S-04 6-row form, submit-only validation, dirty-aware discard prompt.
- `SessionIntakePage` + `SessionGalleryPage` route pages.
- `SessionGalleryPage` — header + summary bar + thumbnail grid + slide-in detail panel (`pageForward` / `fadeIn` for reduced-motion), multi-select via Shift+click, End-session button.
- `GallerySkeleton` + `CaptureThumbnail` UI primitives (`src/renderer/components/ui/`).
- `nav-store` extended: `Page` enum gains `session-intake` + `session-gallery`; `currentProjectId`, `currentSessionId`, `history` stack (cap 10); `goTo` → `navigate(page, params?)`; `goBack()`.
- IPC handler totals: **16 live / 12 stub** (was 12/15 at PH2-1 / 15/13 mid-D34).

### Phase 2 Week 7 — CaptureService scaffold (2026-04-23)

- `[PH2-1]` `CaptureService` class + 9-step capture pipeline (`src/main/services/capture.service.ts`). SHA-256 of the raw uncompressed framebuffer computed BEFORE any `sharp().jpeg()` call (Architectural Rule 7). Persistence order: `EvidexContainerService.addImage` → `DatabaseService.insertCapture` → `ManifestService.append` → optional `onFlash` callback.
- 10 invariant tests in `__tests__/capture-service.spec.ts` covering hash-before-compression, manifest hash equality, persist-then-manifest ordering, deterministic filenames, region passthrough, and statusTag defaults.
- Test fixture fix (`85a61bd`): mocks now feed real PNG buffers via `sharp({create:{...}}).png().toBuffer()` instead of synthetic RGBA, so tests survive the rebuilt native sharp binary on Asus TUF.
- IPC wiring deferred to PH2-2 (lands with `SessionService`).

### Phase 1 — Fluent UI Design System (FUI-1 → FUI-7, 2026-04-19 → 2026-04-23)

- `[FUI-1]` Foundation: `tokens.css` with the full Fluent token set (layer/fill/stroke/text/accent/status/elevation/radius), `materials.css` (Mica, Acrylic), `loading.css`. Migrated body type from Inter to Segoe UI Variable. Banned the `dark:` Tailwind prefix; `[data-theme='dark']` overrides only.
- `[FUI-2]` Component primitives: 12 reusable UI atoms in `src/renderer/components/ui/` (Button, Card, Checkbox, Dropdown, Input, Modal, ProgressBar, ProgressRing, Radio, Skeleton, StatusBadge, Toast, Toggle).
- `[FUI-3]` App shell: `Shell`, `Sidebar`, `TitleBar`, `NavItem`. Custom title bar with window controls; collapsible nav rail with Windows 11-style accent indicator.
- `[FUI-4]` `ThemeProvider` + system-accent-colour bridge (`theme.service.ts` + `accent-scale.ts`). `useReducedMotion` hook. `framer-motion` page transitions.
- `[FUI-5]` Onboarding flow: 9 steps wired (Welcome, WelcomeBranding, WelcomeTour, UserProfile, Branding, ThemeStorage, HotkeyConfig, DefaultTemplate, Licence, Summary). `onboarding-store.ts`, `persist-onboarding.ts`, validators, hotkey-utils.
- `[FUI-6a/b/c]` Brand icon wiring + `LicenceStep` `KeyRegular` import fix + orb contrast + step-icon revert to Fluent + Fluent scrollbars + brand SVG trim.
- `[FUI-7]` Sidebar collapsed-rail overflow fix (root cause: 48 px rail vs 40 px-wide nav-item icon slot) + dashboard metric-card polish. **Asus TUF gate green; Phase 1 closed.**

### Phase 1 — main-process services (2026-04-18 → 2026-04-22)

- `EvidexContainerService` — AES-256-GCM ZIP container. Atomic save dance: `writeFile(.tmp)` → `rename(.evidex.bak)` → `rename(.tmp → .evidex)` (Architectural Rule 6).
- `DatabaseService` — better-sqlite3, two-instance (app.db + per-project evidex.db). 40+ public methods; all writes via `db.prepare().run()`. `sign_offs`, `access_log`, `version_history` are append-only (Architectural Rule 5 — `insert*` methods only, no `update*`/`delete*`).
- `ManifestService`, `NamingService`, `SettingsService`, `ThemeService`.
- `LicenceService` — `LICENCE_MODE='none'` short-circuit; `keygen` mode reads `EVIDEX_KEYGEN_PUBLIC_KEY` (PEM Ed25519 SPKI) + `EVIDEX_KEYGEN_ACCOUNT_ID`; `isDev` short-circuits validate so unpackaged builds never block on activation.
- `container-crypto.ts`, `licence-token.ts`, `machine-fingerprint.ts` helpers.
- Migrations: `001_initial_schema.ts` + index.

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
