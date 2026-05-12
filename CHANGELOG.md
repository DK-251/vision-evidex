# Changelog — Vision-EviDex

All notable changes are documented here. Versions follow [SemVer](https://semver.org/).

## [Unreleased]

### Phase 2 Week 10 polish — UX redesign + critical wiring fixes (2026-05-12)

- **[CRITICAL] Annotation save handlers wired for real** — `CAPTURE_ANNOTATE_SAVE` and `ANNOTATION_SAVE` were both registered against `stub` (returns null) in the W10 raw build. Editor drew, Save returned OK, nothing persisted. Now a real `saveAnnotation` handler in `ipc-router.ts` upserts the Fabric canvas JSON into `annotation_layers`, writes the composite PNG to `images/annotated/<basename>.annotated.png` via `container.addImage()`, stamps `captures.annotated_path` + `has_annotation = 1`, and calls `container.save()`. EC-14 (original-immutable) holds — the source JPEG under `images/original/` is never touched.
- **[CRITICAL] Annotation editor reachable from gallery** — `SessionGalleryPage.tsx:473` and `SessionDetailPage.tsx` both had hard-`disabled` "Open in annotation editor" buttons with stale "Phase 2 Wk 9" / "Wk 10" comments. Enabled, wired to `window.evidexAPI.capture.openAnnotation(captureId)`.
- **[CRITICAL] `before-quit` awaits `projectService.close()`** — `app.on('will-quit', …)` was sync and the prior `before-quit` did not exist. Red-X / OS shutdown could complete before `container.save()` finished → potential data loss. New module-scope `getOpenProjectIdForQuit` closure + `before-quit` interception with `isQuitting` flag preserves Architectural Rule 8 on every teardown path.
- **`pendingRegionCapture` try/catch** in `app.ts` — region-capture exceptions previously left a dangling Promise. Now wrapped with `logger.warn` so the failure shows in run-report telemetry.
- **`.env.example`** — `KEYGEN_*` renamed to `EVIDEX_KEYGEN_*` to match `app.ts:124–129` env reads. New devs no longer silently miss keygen-mode config.
- **Snipping-Tool-style capture toolbar** — `window-manager.ts` now creates the toolbar window with `movable: false`, `focusable: false`, `show: false`, and snaps it to the top-centre of the primary display via `positionToolbarTopCenter()` on every `showToolbarWindow()` (handles monitor changes between sessions). `showInactive()` keeps it from stealing focus. React component rewritten as a Fluent pill (height 48, radius 24, Mica/acrylic) with a pulsing red recording dot, status counter pills (pass/fail/blocked), Fluent icons (`ScreenshotRegular`/`WindowRegular`/`CropRegular`/`RecordStopRegular`/`ChevronUpRegular`/`ChevronDownRegular`), red "End" button, collapse chevron. Slide-down entrance via framer-motion. Zero inline styles — all in new `.capture-toolbar` family in `components.css`.
- **Session gallery + capture-card redesign** — 4 Fluent stat tiles (Pass/Fail/Blocked/Total with accent-top borders) replace the thin summary row. New 16:9 thumbnail cards with hover lift + `:focus-visible` parity, sequence/check badges via tokens (`--color-overlay-strong`, `--color-accent-overlay`), captured-at clock footer. Detail panel widened to 400px with full-bleed hero image, structured `.detail-panel__meta` grid, segmented `.tag-picker` (replaces outline-ring badges), and an accent **Annotate** button. Same classes used by both `SessionGalleryPage` (live) and `SessionDetailPage` (historical) so the two pages are visually identical.
- **Fluent Tooltip component** — `Tooltip.tsx` (custom, framer-motion fade, 200ms delay, no new deps) + `.tooltip` family in `components.css`. Replaces bare `title=` HTML attribute in `NavItem`, `TitleBar` caption buttons, and Dashboard Phase-3-locked Quick Action buttons.
- **Theme system hardening (Asus issues #1/#2/#3)** — `ThemeProvider` now gates `data-theme` application on both `settingsLoaded` AND first `theme:systemThemeChange` broadcast → flash-of-wrong-theme on launch eliminated. 1s timeout fallback unblocks sub-windows without preload. `ThemeStorageStep` calls `setPreference()` on every selection so the theme survives Back/Next inside onboarding and persists into the main app.
- **Modal focus trap + scoped Escape** — `Modal.tsx` now traps Tab/Shift+Tab inside the dialog by cycling between first and last tabbable descendants. Escape handler scoped via `onKeyDown` on the dialog with `stopPropagation` so nested confirm modals close only themselves. `previousFocusRef` restores focus to the trigger element on close.
- **Type-safety sweep** — `aria-invalid={x || undefined}` anti-pattern (renders as literal string "false") replaced with conditional spread in `Input`, `Textarea`, `SessionIntakeModal`, `CreateProjectPage`.
- **Resource-leak logging** — `EvidexContainerService.close()` no longer swallows `projectDb.close()` or tmp-dir cleanup errors silently; `CaptureService` auto-backup failures now log `capture.autoBackup failed` so disk-pressure shows up in run-report telemetry. Dead `EvidexContainerService.integrityCheck()` (only threw) removed.
- **Accent validation** — `accent-scale.ts` now logs a `console.warn` for non-`#rrggbb` accent values instead of silently no-op'ing.
- **Row-button refactor** — `ProjectOverviewPage` and `SessionListPage` row buttons moved from `onMouseEnter/Leave` inline handlers to `.row-button` / `.session-list-row` CSS classes with `:hover` + `:focus-visible` parity — keyboard users now see the hover affordance.
- **Stale phase-reference cleanup** — dropped "Phase 2 Wk 7/8/9/10" comments in `DashboardPage`, `SessionGalleryPage`, `SessionDetailPage`.
- **CLAUDE.md refreshed** — §1 reflects the polish landing; §2 channel counts corrected (35→41 invoke, 7-8→11 events with full list); §3 marks `ExportService`/`TrayService`/`MetricsImportService`/`SignOffService` as Phase 3/4 (not yet implemented), notes `metrics.service.ts` filename pending rename.
- **BACKLOG.md** — explicit PM-11 deferral entry with Risk R-14 reference and Phase 3 landing target.
- **`seed-defaults.ts`** — seeds all 5 builtin templates (added DSR, UAT-handoff, Bug-report, Audit-pack — previously only `tpl-default-tsr`). Idempotent INSERT-OR-IGNORE.
- **New regression tests** — `__tests__/ipc-router.spec.ts` gets two cases that catch the stub-handler bug class (both `CAPTURE_ANNOTATE_SAVE` and `ANNOTATION_SAVE` must refuse with `PROJECT_NOT_FOUND` when no project is open). New `__tests__/templates-schema.spec.ts` guards all 5 builtin JSONs against `TemplateSaveSchema` drift and asserts coverage of all 5 PRD report types.

### Phase 2 Week 10 — Toolbar, region capture, annotation editor, project settings (2026-05-12)

- **D36 Capture toolbar** — `src/toolbar/App.tsx` fully implemented: session info pill, live pass/fail/blocked counter driven by `SESSION_STATUS_UPDATE`, 3 capture mode buttons (fullscreen/window/region), End Session button, collapse toggle. `showToolbarWindow()` in `window-manager.ts` re-enabled — pushes initial `SESSION_STATUS_UPDATE` on show so counter initialises at zero rather than blank.
- **D34 Region capture overlay** — `src/region/App.tsx` rubber-band selector: crosshair cursor, drag rect with px×py dimension label, min-8px guard against accidental clicks, Esc to cancel. IPC channels `REGION_SELECTED` / `REGION_CANCEL` wired in `app.ts` with `pendingRegionCapture` callback pattern so Ctrl+Shift+3 blocks until selection completes, then fires `CaptureService.screenshot()` with the rect.
- **D41–D44 Annotation editor** — `src/annotation/App.tsx` full Fabric.js implementation: canvas initialises from `annotation:load` IPC event, background image non-interactive (EC-14 original-immutable rule enforced), tools: arrow, text callout, highlight rect, PII blur placeholder (20 px minimum per OWASP). Undo/redo 20-step history (Ctrl+Z/Y). Save flow: `canvas.toJSON()` + `canvas.toDataURL('image/png')` sent to main via `CAPTURE_ANNOTATE_SAVE`. Colour picker (6 presets). `onAnnotationLoad` event wired in preload.ts.
- **PM-03 Project settings** — `ProjectSettingsPage.tsx` (new): rename + re-client form with save. Wired into `App.tsx` switch case and `nav-store` `isProjectPage` list so `currentProjectId` is preserved. Settings button added to `ProjectOverviewPage` header.
- **PM-08 Archive project** — Danger zone card in `ProjectSettingsPage`. Calls `project.update({ status: 'archived' })` → navigates to `project-list`.
- **PM-03/PM-08 backend** — `ProjectService.update()` added: patches name/clientName/status in per-container project DB, refreshes `recent_projects` in `app.db` when display fields change. `PROJECT_UPDATE` IPC handler + `ProjectUpdateSchema` wired.
- **D28 Auto-backup** — `EvidexContainerService.backup()` copies `.evidex` → `.evidex.bak`. Triggered in `CaptureService.screenshot()` every 10th capture (Risk R-12 mitigation). Failure swallowed so backup never aborts the capture pipeline.
- **DB-04 Quick Tour** — button added to Quick Actions in `DashboardPage`. Navigates to settings.
- **DB-05 Session active indicator** — static “No session active” span replaced with reactive `useSessionStore((s) => s.activeSession)` — shows red pill with test ID when live, grey text otherwise.
- **CAPTURE_OPEN_ANNOTATION IPC** — extracts image from container, opens annotation window, pushes `ANNOTATION_LOAD` event.
- **IPC channels added** — `CAPTURE_OPEN_ANNOTATION`, `ANNOTATION_LOAD`, `ANNOTATION_SAVE`, `PROJECT_UPDATE`, `REGION_SELECTED`, `REGION_CANCEL`.
- **FEATURES.md** — updated from 41/92 to 51/92. DB, EC, PM modules all fully complete.
- **Tests** — `__tests__/w10-coverage.spec.ts` adds 20 new assertions covering all W10 items.

### Phase 2 Week 9 — Session history surface (2026-05-11)

- **`ProjectOverviewPage`** (new) — post-open project landing. Sessions grouped by `applicationUnderTest` in collapsible app cards. Aggregate pass/fail/blocked counts per app group. Stat strip (total/active/completed). Empty state with first-session CTA. Resolves Asus issue #9 (session app-card grouping).
- **`SessionListPage`** (new) — full session history. Live search (testId, testName, app, tester). Three-tab filter: All / Active / Completed. Status icons (red record = live, green checkmark = ended). Sorted by most recent first.
- **`SessionDetailPage`** (new) — historical session viewer. Session metadata card (app, env, tester, dates, duration, requirement). Capture grid with lazy thumbnail loading via `capture:thumbnail` IPC. Tag picker with optimistic updates. Slide-in detail panel.
- **`session:list` IPC** — returns `Session[]` for a project. `SessionListSchema` + router handler + `window.evidexAPI.session.list()`.
- **`capture:list` IPC** — returns `Capture[]` for a session. `CaptureListSchema` + router handler + `window.evidexAPI.capture.list()` + `CaptureService.getForSession()`.
- **`capture:thumbnail` IPC** — extracts and resizes a 160×90 JPEG on demand from the `.evidex` container. `CaptureGetThumbnailSchema` + `CaptureService.getThumbnail()` + `EvidexContainerService.extractImage()`.
- **nav-store** extended: `project-overview`, `session-list`, `session-detail` page types. `navigate()` correctly preserves/clears projectId/sessionId on all new pages.
- **Sidebar** Sessions item enabled — navigates to `project-overview`, active on all session-related pages.
- **All project-open entry points** now navigate to `project-overview` (CreateProjectPage, ProjectListPage, DashboardPage). Resolves Asus manual test finding (session form auto-pop).
- **FEATURES.md** updated from 3/92 to 41/92 — 38 features ticked reflecting Phase 1–2 completion.
- **Tests**: +64 new tests in `__tests__/w9-coverage.spec.ts`. Total: **517/517 PASS** across 27 spec files.

### Phase 2 Week 8 — Project lifecycle + per-container DB (2026-05-05)

- **Per-container project DB** — `EvidexContainerService` now spawns a real `DatabaseService` against `os.tmpdir()/evidex-work/<containerId>/project.db` on `create()` / `open()`, runs `initProjectSchema()` (idempotent), WAL-checkpoints + slurps the bytes back into the encrypted ZIP on `save()`, and `rm -r`'s the temp dir on `close()`. Replaces the AQ1 plan: a `.evidex` now carries enough state to round-trip close → re-open on the same machine.
- **`SessionService` + `CaptureService` deps** swap from `db: DatabaseService` to **`getDb: () => DatabaseService | null`**. Both throw `PROJECT_NOT_FOUND` with a UI-friendly message when no project is open (closes the pre-Wk8 NO_CONTAINER sentinel).
- **`ProjectService`** (new) — `create` / `open` / `close` / `get` / `list` / `getRecent`. Sanitises project name → `.evidex` filename; inserts the project row into the per-container DB; upserts `recent_projects` in `app.db`; ends the active session before tearing down on close; `STORAGE_PATH_NOT_WRITABLE` for unwritable directories.
- **`seedBuiltinDefaults`** — first-run seed for `tpl-default-tsr` + `brand-default` in app.db (idempotent). Phase 3 will seed the remaining 4 builtin templates alongside the Template Builder.
- **`project.store.ts`** — Zustand renderer store with `activeProject` / `recentProjects` / `createProject` / `openProject` / `closeProject` / `loadRecent`. No persistence; `recent_projects` in `app.db` is the durable layer.
- **`ProjectListPage`** (S-13) — post-onboarding home (AQ5). Recent-projects list + empty state hero + Create CTA. Sidebar: Projects becomes slot 1, Dashboard slot 2.
- **`CreateProjectPage`** (S-11) — full-page form (PRD §6.2 US-PM-01 AC1). Two sections: project info + configuration. Live filename preview round-trips main via the new `naming:preview` IPC (AQ4), debounced 200 ms.
- **`SessionLookup` adapter** — real project lookup via `container.getProjectDb()`; resolves `projectName` / `clientName` / `namingPattern` from project rows. `nextSequenceNum` now queries the project DB (was a latent bug querying `app.db`'s nonexistent captures table).
- **`IPC_EVENTS.CAPTURE_ARRIVED`** — main broadcasts the full `CaptureResult` after every successful capture (both IPC-invoked and hotkey-triggered paths). `session.store` subscribes at module-eval and forwards to `addCapture`, so `SessionGalleryPage` populates in real time.
- **Dashboard recent-projects** sourced from the project store — a project created elsewhere reflects without remounting.
- **IPC channels**: 35 invoke channels (Wk 8 added 7) + 8 events (added `capture:arrived`). Live/stub: **26 live / 9 stub** (was 16/12 at PH2-W7 close).
- **Rule 4 + Rule 6 audits — both PASS** (2026-05-05). All `db.prepare(...)` use bound params; the three `db.exec` calls are DDL/static migrations only. Every reachable file writer (container.save, licence, settings) uses the `.tmp` + rename pattern; ManifestService delegates to container; logger appendFileSync is intentional. Full audit log in [SETUP-NOTES.md](SETUP-NOTES.md#audits).
- **FEATURES.md**: PM-01, PM-02, PM-12 ticked at `b19dd61` — first non-zero P0 feature count. Remaining items (EC-04..17, OB tail, WS tail) tick after Asus's manual gate verification.
- **Tests**: +9 ProjectService unit tests, +9 project.store renderer tests, +1 full round-trip integration test (`integration.project-roundtrip.spec.ts`). Existing session/capture/integration specs updated to the `getDb` getter pattern. Expected total: ~346 tests across 25 files.

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
