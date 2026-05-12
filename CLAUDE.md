# CLAUDE.md — Vision-EviDex Developer Reference

READ THIS FIRST on every coding session. Keep under 2,000 tokens.
Update Section 1 each sprint. Update Section 8 from `run-reports/latest.md`.

## 1. Current sprint focus

- **SPRINT:** Phase 2 Week 10 — ✅ COMPLETE + UX polish pass. Phase 3 (Report Engine) is next.
- **BRANCH:** `main`
- **STATUS:** W10 build + UX polish landed (2026-05-12). Awaiting Asus gate run.
- **GOAL:** Close Phase 2 gaps AND ship the UX polish: real annotation save wiring, Snipping-style toolbar, redesigned session gallery + capture cards, Fluent Tooltip, theme system hardening, Modal focus trap.
- **W10 DELIVERED + UX polish:**
  - ✓ D36 `toolbar/App.tsx` — Snipping-Tool-style pill (top-center, slide-down, Fluent icons, status pills, drag-disabled, focus-non-stealing)
  - ✓ D34 `region/App.tsx` — rubber-band region selector with IPC result
  - ✓ D41–D44 `annotation/App.tsx` — Fabric.js editor: arrow, text, highlight, blur, undo/redo 20 steps
  - ✓ **`CAPTURE_ANNOTATE_SAVE` + `ANNOTATION_SAVE` handlers** — real persistence into `annotation_layers` + `images/annotated/` (was stub in raw W10)
  - ✓ **"Open in annotation editor" button enabled** in `SessionGalleryPage` + `SessionDetailPage` (was hard-`disabled`)
  - ✓ **`before-quit` awaits `projectService.close()`** — Architectural Rule 8 holds on red-X / OS shutdown
  - ✓ PM-03 `ProjectSettingsPage.tsx` — rename + re-client form
  - ✓ PM-08 archive project via `project.update({ status: 'archived' })`
  - ✓ `ProjectService.update()` — PM-03/PM-08 backend
  - ✓ D28 `EvidexContainerService.backup()` — auto-backup every 10 captures
  - ✓ DB-04 Quick Tour button on dashboard
  - ✓ DB-05 session active indicator (reactive, store-driven)
  - ✓ `CAPTURE_OPEN_ANNOTATION`, `PROJECT_UPDATE`, `REGION_SELECTED/CANCEL`, `ANNOTATION_LOAD/SAVE` IPC channels
  - ✓ **Fluent `Tooltip` component** (custom, no new deps) replacing bare `title=` across NavItem / TitleBar / Dashboard
  - ✓ **Theme system hardening** — ThemeProvider gates `data-theme` on settings-loaded + system-theme-broadcast (Asus #1/#3), onboarding `setPreference()` (Asus #2)
  - ✓ **Modal focus trap + scoped Escape** (Tab/Shift+Tab cycle, no propagation to parent modals)
  - ✓ **Gallery redesign** — 4 stat tiles, 16:9 thumbnail cards with hover lift + sequence/check badges + time footer, segmented Fluent `tag-picker`, accent "Annotate" button, structured detail panel
  - ✓ `w10-coverage.spec.ts` — 20 new test assertions
  - ✓ FEATURES.md: 41 → 51/92. DB (5/5), EC (17/17), PM (10/10) all complete.
- **NEXT SPRINT:** Phase 3 Week 11 — Template Engine. `[PH2-ROUTING]` HashRouter migration before Phase 3 starts.

## 2. IPC channels (`src/shared/ipc-channels.ts`)

Invoke (renderer → main, **41 channels** as of W10):
- session: `session:create`, `session:end`, `session:get`, `session:list`
- capture: `capture:screenshot`, `capture:list`, `capture:thumbnail`, `capture:annotate:save`, `capture:tag:update`, `capture:openAnnotation`
- annotation: `annotation:save` (annotation-window → main composite)
- project: `project:create`, `project:open`, `project:close`, `project:get`, `project:list`, `project:recent`, `project:update`
- export (Phase 3 stubs): `export:word`, `export:pdf`, `export:html`, `export:auditBundle`
- metrics + template + signoff: `metrics:import`, `metrics:summary`, `template:save`, `template:list`, `signoff:submit`
- licence: `licence:activate`, `licence:validate`
- settings + branding: `settings:get`, `settings:update`, `branding:save`, `branding:list`
- naming preview: `naming:preview`
- recent + dashboard: `recentProjects:list`
- dialogs: `dialog:selectDirectory`, `dialog:openFolder`
- title bar: `window:minimize`, `window:maximizeToggle`, `window:close`, `window:isMaximized`

Events (main → renderer, **11 channels** as of W10):
`capture:flash`, `capture:arrived`, `session:statusUpdate`, `storage:warning`, `app:updateAvailable`, `theme:accentColourUpdate`, `theme:systemThemeChange`, `window:maximizedChange`, `region:selected`, `region:cancel`, `annotation:load`

## 3. Service map (`src/main/services/`)

- `ProjectService` (Wk 8) → DatabaseService (app.db for recent_projects), EvidexContainerService (single-slot), SessionService (close-time end-active-session)
- `CaptureService` → CaptureSource, SessionLookup, EvidexContainerService, NamingService, **`getDb: () => DatabaseService | null`** (per-container project DB)
- `SessionService` → **`getDb: () => DatabaseService | null`** (per-container project DB), EvidexContainerService, ShortcutService, SettingsService (hotkey lookup), WindowManager
- `EvidexContainerService` → node:crypto (AES-256-GCM), JSZip, **owns the per-container project DB lifecycle** (spawns at `<tmp>/evidex-work/<containerId>/project.db`, WAL-checkpoints + slurps on save, removes on close)
- `DatabaseService` → better-sqlite3 (sync, main-process only). **Two file-backed instances at runtime:** `app.db` (templates / branding_profiles / recent_projects / metrics_data) + the per-container `project.db` (projects / sessions / captures / annotation_layers / sign_offs / import_history / access_log / version_history) extracted from the open `.evidex`.
- `ExportService` **(Phase 3 — not yet implemented)** → will own DatabaseService, EvidexContainerService, docx, printToPDF, archiver, TemplateRenderer
- `MetricsImportService` **(Phase 3 — not yet implemented)** → will own xlsx (SheetJS), DatabaseService, Zod (z.coerce for LibreOffice compat). Filename today is `metrics.service.ts` (dashboard-only); rename to `metrics-import.service.ts` when the import path lands.
- `LicenceService` → node:crypto, node-machine-id. `LICENCE_MODE==='none'` → no-op; `keygen` real path wired Phase 1 Week 4.
- `NamingService` → stateless. `preview()` is exposed via `naming:preview` IPC for live filename preview on `CreateProjectPage`.
- `ManifestService` → node:crypto (SHA-256), EvidexContainerService
- `SignOffService` **(Phase 4 — not yet implemented)** → will own DatabaseService, EvidexContainerService, SettingsService
- `SettingsService` → fs (%APPDATA%/VisionEviDex/settings.json), atomic .tmp+rename writes
- `ShortcutService` → electron.globalShortcut
- `TrayService` **(Phase 4 — not yet implemented)** → will own electron.Tray
- `seedBuiltinDefaults` (Wk 8) → idempotent first-run seed for `tpl-default-tsr` + `brand-default` in app.db. **TODO Phase 3:** seed remaining 4 builtin templates (DSR, UAT, BUG, AUDIT).

No service calls another service directly. All communication is via IPC or constructor injection.

## 4. Architectural rules (NEVER break these)

1. Renderer NEVER imports from `src/main/` — only `window.evidexAPI` (preload bridge)
2. All IPC handlers run `schema.parse()` before passing to service
3. All IPC handlers return `IpcResult<T>` — never throw across IPC boundary
4. All DB writes use prepared statements — no string-interpolated SQL ever
5. `sign_offs`, `access_log`, `version_history` are append-only — no UPDATE/DELETE in DatabaseService
6. All file writes are atomic — write to `.tmp`, then `fs.rename()` to final path
7. SHA-256 hash computed BEFORE JPEG compression — never after (step 3 in capture pipeline)
8. `EvidexContainerService.save()` must be called after every session end
9. `BrandingProfile.logoBase64` is a base64 string — NEVER a file path
10. In no-licence mode (`EVIDEX_LICENCE_MODE=none`), `LicenceActivationPage` never renders
11. `EvidexContainerService` is single-slot — `open()` closes any currently-held handle
12. `fabric@5.3.0` is pinned exactly. `StoredAnnotationLayer.fabricVersion` stores `fabric.version` at save time.

## 5. Key type names (`src/shared/types/`)

- Entities: `Project`, `Session`, `Capture`, `BrandingProfile`, `Template`, `TemplateSchema`, `TemplateSection`
- Audit: `SignOff`, `ImportedMetrics`, `ManifestEntry`, `AccessLogEntry`, `StoredAnnotationLayer`
- Results: `SessionSummary`, `SessionStatus`, `CaptureResult`, `AnnotationResult`, `IpcResult<T>`
- Annotation: `FabricCanvasJSON`, `FabricObject`, `BlurRegion`, `AnnotationSaveInput`
- Enums: `StatusTag`, `CaptureMode`, `ExportFormat`, `SignOffDecision`, `UserRole`, `LicenceMode`, `ModuleStatus`
- Error codes: `EvidexErrorCode` (33 values, see `src/shared/types/ipc.ts`) — Wk 8 added `STORAGE_PATH_NOT_WRITABLE`

## 6. File naming conventions

- Files: `kebab-case.ts` / `kebab-case.service.ts` / `kebab-case.store.ts`
- Components: `PascalCase.tsx`
- Tests: `same-name.spec.ts` collocated with source OR in `__tests__/`
- Commits: `[MODULE] type: description` — e.g. `[CAPTURE] feat: add SHA-256 hashing`
- Branches: `feature/*` for new features, `fix/*` for bug fixes

## 7. Error handling pattern

- Services throw: `new EvidexError(code, 'message', fields?)`
- IPC router: catches `EvidexError` → returns `{ ok: false, error: { code, message, fields } }`
- Renderer: `if (!result.ok) { showToast('error', result.error.message); return; }`
- Error boundary: wrap every major page with `EvidexErrorBoundary`
- Components call hooks → hooks call `window.evidexAPI` → never skip hook layer

## 8. Current FAIL items (from latest run report)

- **Known Phase 0 issue:** CTS laptop hits a corporate SSL cert error in `node-gyp` when building native modules (`unable to get local issuer certificate` downloading Node headers). Mitigation: Asus TUF performs the real install + `electron-rebuild`. CTS is code-authoring only.
- **Native-ABI rebuild rhythm (better-sqlite3):** `npm run dev` and `npm test` need different NODE_MODULE_VERSION for the same `.node` binary. Automated via `predev` → `rebuild:electron` and `pretest` → `rebuild:node` npm scripts. No manual rebuild needed; each command is self-healing.
- **Run report gates code health:** `npm run report` runs `npm run typecheck` + `npm test` as prechecks and exits 1 on either failure. Failing tests / TS errors surface in `latest.md` "Pre-checks" section and block STATUS.md PASS. Test count: **347 across 26 files** (confirmed at Asus gate `7975bb9` / 2026-05-08, typecheck PASS, PBKDF2 158.71ms mean).
- **Run report measures Risk R-07:** every `npm run report` also runs the PBKDF2 benchmark (5 samples after one warm-up), records to `run-reports/sprint0-benchmark.json`, and surfaces WARN in next_actions if max > 800 ms. Asus TUF reference: mean ≈ 91 ms (88% headroom — most recent: 143.72 ms mean post-PH2-W7). Standalone: `npm run bench:pbkdf2`.
- **Rule 4 PASS (2026-05-05):** all `db.prepare(...)` call sites in `database.service.ts` use `?`/`@key` bound parameters; the three `db.exec()` calls are DDL only (schema CREATE + static migration up-strings from `PROJECT_MIGRATIONS`). Zero string-interpolated SQL. Full audit log in [SETUP-NOTES.md](SETUP-NOTES.md#audits).
- **Rule 6 PASS (2026-05-05):** all reachable file writers atomic — `EvidexContainerService.save()`, `LicenceService.writeLicenceFile()`, `SettingsService.saveSettings()` all use `.tmp` + rename. `ManifestService` does no direct disk I/O (delegates to container's atomic save). `logger.ts` uses `appendFileSync` for append-only logs (rule N/A). Branding logos live as `logoBase64` in DB per Rule 9 (no disk write). New writers must keep this pattern. Full audit log in [SETUP-NOTES.md](SETUP-NOTES.md#audits).

## 8a. Two-machine comms layer (read these first in every session)

1. [STATUS.md](STATUS.md) — live pulse (auto-rewritten by `npm run report`)
2. [run-reports/latest.md](run-reports/latest.md) — detailed last-run report
3. [INBOX-TO-CTS.md](INBOX-TO-CTS.md) — messages from Asus awaiting CTS action
4. [FEATURES.md](FEATURES.md) — tick boxes as features land

CTS (Claude via filesystem connector) writes directly to [INBOX-TO-ASUS.md](INBOX-TO-ASUS.md) when a gate run or investigation is needed. You commit and push; Asus pulls and executes.

## 9. Locked decisions (do not re-litigate)

- Scaffold root: `c:\Users\2072940\Vision-EviDex\vision-evidex\`
- GHE remote: `https://github.com/DK-251/vision-evidex.git`
- Default dev licence mode: `EVIDEX_LICENCE_MODE=none` → `LicenceService` returns `{ valid: true }` without touching disk. `keygen` mode landed D16 and reads `EVIDEX_KEYGEN_PUBLIC_KEY` (PEM Ed25519 SPKI) + `EVIDEX_KEYGEN_ACCOUNT_ID`; `isDev` still short-circuits validate so unpackaged builds never require an activation flow.
- Single active project at a time; `EvidexContainerService` uses a single-slot pattern
- Feature ID tables (not the "82" header count) are the implementation checklist
- `fabric@5.3.0` exact pin + `fabricVersion` stored per annotation layer
- `licence.sig` = UTF-8 text file containing a Keygen.sh JWT-style token (never created in `none` mode)
