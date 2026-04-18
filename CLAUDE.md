# CLAUDE.md — Vision-EviDex Developer Reference

READ THIS FIRST on every coding session. Keep under 2,000 tokens.
Update Section 1 each sprint. Update Section 8 from `run-reports/latest.md`.

## 1. Current sprint focus

- **SPRINT:** Phase 1 Week 3 — Electron shell (D11–D15)
- **BRANCH:** `main`
- **GOAL:** Turn the scaffold into a booting Electron app: app.ts entry (D11), WindowManager with four BrowserWindows (D12), Preload bridge + IPC router (D13), SettingsService + app.db schema (D14), Friday Asus run (D15). Exit criteria: `npm run dev` boots, IPC `settings:*` handlers validate + round-trip, AppData files created, first Wk3 security-gate test (invalid payload → `VALIDATION_FAILED` IpcResult) in place.

## 2. IPC channels (`src/shared/ipc-channels.ts`)

Invoke (renderer → main, 17 channels):
- `session:create`, `session:end`
- `capture:screenshot`, `capture:annotate:save`, `capture:tag:update`
- `project:create`, `project:open`, `project:close`
- `export:word`, `export:pdf`, `export:html`, `export:auditBundle`
- `metrics:import`, `template:save`, `signoff:submit`
- `licence:activate`, `licence:validate`

Events (main → renderer, 4):
- `capture:flash`, `session:statusUpdate`, `storage:warning`, `app:updateAvailable`

## 3. Service map (`src/main/services/`)

- `CaptureService` → DatabaseService, EvidexContainerService, ManifestService, NamingService, WindowManager
- `SessionService` → DatabaseService, EvidexContainerService, ShortcutService, WindowManager
- `EvidexContainerService` → node:crypto (AES-256-GCM), archiver, DatabaseService, ManifestService
- `DatabaseService` → better-sqlite3 (sync, main-process only; two instances: evidex.db + app.db)
- `ExportService` → DatabaseService, EvidexContainerService, docx, printToPDF, archiver, TemplateRenderer
- `MetricsImportService` → xlsx (SheetJS), DatabaseService, Zod (z.coerce for LibreOffice compat)
- `LicenceService` → node:crypto, node-machine-id. `LICENCE_MODE==='none'` → no-op; `keygen` real path wired Phase 1 Week 4.
- `NamingService` → DatabaseService (sequence counter), SettingsService
- `ManifestService` → node:crypto (SHA-256), EvidexContainerService
- `SignOffService` → DatabaseService, EvidexContainerService, SettingsService
- `SettingsService` → fs (%APPDATA%/VisionEviDex/settings.json)
- `ShortcutService` → electron.globalShortcut
- `TrayService` → electron.Tray

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
- Error codes: `EvidexErrorCode` (27 values, see `src/shared/types/ipc.ts`)

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

- **No run report yet.** First Asus TUF run pending — `run-reports/latest.md` is a placeholder.
- **Known Phase 0 issue:** CTS laptop hits a corporate SSL cert error in `node-gyp` when building native modules (`unable to get local issuer certificate` downloading Node headers). Mitigation: Asus TUF performs the real install + `electron-rebuild`. CTS is code-authoring only.

## 8a. Two-machine comms layer (read these first in every session)

1. [STATUS.md](STATUS.md) — live pulse (auto-rewritten by `npm run report`)
2. [run-reports/latest.md](run-reports/latest.md) — detailed last-run report
3. [INBOX-TO-CTS.md](INBOX-TO-CTS.md) — messages from Asus awaiting CTS action
4. [FEATURES.md](FEATURES.md) — tick boxes as features land

Write to [INBOX-TO-ASUS.md](INBOX-TO-ASUS.md) when CTS needs the Asus to verify, run, or investigate something specific.

## 9. Locked decisions (do not re-litigate)

- Scaffold root: `c:\Users\2072940\Vision-EviDex\vision-evidex\`
- GHE remote: `https://github.com/DK-251/vision-evidex.git`
- Phase 0+1 licence mode: `EVIDEX_LICENCE_MODE=none`; `LicenceService` returns `{ valid: true }` unconditionally until Phase 1 Week 4
- Single active project at a time; `EvidexContainerService` uses a single-slot pattern
- Feature ID tables (not the "82" header count) are the implementation checklist
- `fabric@5.3.0` exact pin + `fabricVersion` stored per annotation layer
- `licence.sig` = UTF-8 text file containing a Keygen.sh JWT-style token (never created in `none` mode)
