# INBOX — CTS → Asus TUF

Append-only messages from the CTS laptop to the Asus TUF. CTS writes here when it needs the run machine to verify something specific, run a targeted test, or investigate a failure.

**Protocol:**
- Append new entries at the TOP (reverse chronological).
- Date format: `YYYY-MM-DD HH:MM` (local Asus time — consistent reference).
- Mark entries resolved with `[RESOLVED YYYY-MM-DD]` prefix. Never delete.

**Standing rule (Asus):** on every `git pull` from CTS, read the topmost
unresolved entry here and execute its checklist before any other work.
On every `git push` from CTS, `git pull` first, then re-read this file.
Default cadence if no new entry: `npm run report` and push `run-reports/` + `STATUS.md`.

---

## 2026-04-18 — URGENT: fix blank renderer window (root cause found)

**From:** CTS (Claude Code)
**What landed:** [MAIN] fix: correct the main renderer's dev URL + prod file path in `window-manager.ts`.

### Why nothing was visible

User ran `npm run dev`, saw the Electron window open (title "Vision-EviDex", File/Edit menu) with a completely blank white content area — no splash, no wizard, no error boundary. React had never mounted.

Root cause in `src/main/window-manager.ts::loadRendererEntry`:

- Before: `entry === 'main' ? RENDERER_BASE_URL : ${RENDERER_BASE_URL}/src/${entry}/index.html`
- `renderer.root: '.'` in `electron.vite.config.ts` means the dev server's document root is the project root. There is no `index.html` at project root — the main entry HTML lives at `src/renderer/index.html`.
- `window.loadURL(RENDERER_BASE_URL)` therefore hit the dev server's root path `/` which vite serves as an empty/404 response — hence the blank screen.
- The other three entries (toolbar/annotation/region) already used the correct `${RENDERER_BASE_URL}/src/${entry}/index.html` form, which is why they'd have worked; only the main window was broken.

Prod path had the symmetric bug (`../renderer/index.html` vs the actual built path `../renderer/src/renderer/index.html`), so packaged builds would also have shown a blank window.

### Why this was never caught

Every Asus dev-smoke entry in `INBOX-TO-CTS.md` has verified by terminal logs only (`app.ready`, `services.ready`, `licence.validate`). Those fire from the **main process** and have no relation to whether the renderer loaded. Nobody opened the window and looked at the content until today.

### Fix

```diff
- const url = entry === 'main' ? RENDERER_BASE_URL : `${RENDERER_BASE_URL}/src/${entry}/index.html`;
+ const dir = entry === 'main' ? 'renderer' : entry;
+ window.loadURL(`${RENDERER_BASE_URL}/src/${dir}/index.html`);
```

Both dev and prod branches unified around the same `src/<dir>/index.html` form; main maps to `renderer`, the other three keep their own names.

### Verification ask — please actually open the window this time

1. `git pull`
2. `npm run report` — expected unchanged PASS (this is a runtime-only path, no tests touch it).
3. `npm run dev`
4. **Look at the Electron window**, not just the terminal. Expected sequence, all within ~1 second:
   - Brief pulsing `BootSkeleton` card (the skeleton change from `939dfa6`)
   - Then the onboarding wizard: "Step 1 of 7" header, step title ("Welcome to Vision-EviDex" or similar), step description, some form fields, **Back / Skip / Next** buttons at the bottom with a blue-filled Next button.
5. If the window is still blank:
   - Press Ctrl+Shift+I to open the renderer DevTools.
   - Paste the **Console** tab contents (look for red lines, 404s on `main.tsx`, CSP violations, missing preload bridge errors).
   - Paste the **Network** tab first failing request (the URL and status code).
   - Paste the exact URL shown in the address-bar-like "file://…" or "http://localhost:…" if visible at the top of DevTools.

This inbox entry supersedes the skeleton-loading verification ask below — that one was blocked by this bug.

---

## 2026-04-18 — D25 polish: Skeleton loading + dev-server restart hint

**From:** CTS (Claude Code)
**What landed:** a shared `Skeleton` + `BootSkeleton` component, wired into the three async-loading states in the renderer so the brief IPC wait shows a placeholder silhouette instead of a blank surface. The earlier "only blank screen" report from the user was the Tailwind class miss already fixed in `49bdd4a` — but the plain "Loading Vision-EviDex…" text flashed so briefly that it looked like a white page. Replacing it with a card-shaped skeleton makes the boot sequence legible even on a fast machine.

### Files

- `src/renderer/components/Skeleton.tsx` — new. Exports `Skeleton` (single placeholder block, Tailwind `animate-pulse` on `bg-surface-secondary`) and `BootSkeleton` (full-viewport onboarding-card silhouette).
- `src/renderer/App.tsx` — `AppShell` returns `<BootSkeleton />` while `settings:get` is in flight instead of the plain text.
- `src/renderer/pages/DashboardPage.tsx` — metric grid shows four `MetricCardSkeleton` cards until `summary` arrives; recent-projects list shows three row-shaped skeletons until `recent` arrives. Text "Loading…" removed.
- `src/renderer/pages/AppSettingsPage.tsx` — whole screen skeletons (header + tab row + two field pairs) until `settings` loads, replacing the empty `min-h-screen` div that looked identical to a blank window.

### Verification ask

1. `git pull`
2. `npm run report` — expected: typecheck PASS, tests PASS (same 189 — no tests touched), PBKDF2 PASS. If typecheck fails on the new `Skeleton.tsx`, paste the exact error.
3. `npm run dev` — expected visible sequence:
   - Brief (~150–500 ms) skeleton splash card with pulsing blocks
   - Then Step 1 of the onboarding wizard (in `none` licence mode the visible steps are: Welcome Tour → User Profile → Branding → Default Template → Hotkeys → Theme & Storage → Summary — seven steps since `licence` is hidden in `none` mode)
   - Navigation: Back / Skip / Next / Finish buttons, blue-filled accent on Next/Finish
4. If still blank: capture the renderer DevTools console (Ctrl+Shift+I on the Electron window), paste any red lines.

### Note re dev-server cache

After a `tailwind.config.js` change, vite must be restarted — hot reload alone won't regenerate the CSS. If you had `npm run dev` running when pulling `49bdd4a`, please stop and re-run. `npm run report` doesn't need this since it builds fresh.

---

## 2026-04-18 — D21 verification: Onboarding Steps 1–4

**From:** CTS (Claude Code)
**What landed:** Phase 1 Wk5 D21 — real step components for the wizard's first four stations, pure-function validation gating Next.

### Files

- `src/renderer/onboarding/validators.ts` — typed data shapes (`UserProfileData`, `BrandingData`) + `isValidUserProfile` / `isValidBranding` / `isStepValid` routing. Email regex, `#RRGGBB` hex check, MIME-type whitelist.
- `src/renderer/onboarding/LicenceStep.tsx` — keygen-only form. Calls `window.evidexAPI.licence.activate`, masks key to `****-****-****-LAST4` on success, renders `null` in `none` mode as a belt-and-braces guard.
- `src/renderer/onboarding/WelcomeTourStep.tsx` — 3-screen fade carousel via Framer Motion's `AnimatePresence` + `motion.div`. Internal dots + prev/next navigation; wizard's outer Next advances steps.
- `src/renderer/onboarding/UserProfileStep.tsx` — name / role dropdown / team / email form; writes to `data.profile`.
- `src/renderer/onboarding/BrandingStep.tsx` — company / logo (PNG|JPG ≤ 2 MB, `FileReader` → base64) / colour picker / header+footer; writes to `data.branding` with live logo preview.
- `src/renderer/pages/OnboardingPage.tsx` — dispatches per `step.id` via a switch; Next/Finish are now disabled until `isStepValid(step.id, data[step.id])` returns true. Steps 5–8 keep the generic placeholder body for D22.
- `__tests__/onboarding-validators.spec.ts` — 18 pure tests: required fields, email regex edge cases, hex colour format (4 malformed variants), MIME whitelist, step-id routing, form-less pass-through.

### Please run (default cadence)

```powershell
git pull
npm run report
```

Expected:
- typecheck PASS
- tests **~158/158 PASS** (139 prior + 18 new validators — one test already existed in the tour invariant check)
- PBKDF2 bench PASS
- dep-audit baseline unchanged
- exit 0

Optionally `npm run dev` — Step 1 is hidden (none mode), so the wizard opens at the Welcome Tour. Next is gated until profile name+role and branding companyName+colour are filled.

### Gate

D21 PASS → CTS proceeds to D22 (Steps 5–8 + the Step-8 Finish persistence that writes to `settings.json` and `branding_profiles` via new IPC channels).

---

## 2026-04-18 — D25 fix-up: 3 TS errors + white-screen root cause

**From:** CTS (Claude Code)
**Context:** Your run reported 3 typecheck fails (`settings.service.ts:37`, `ThemeStorageStep.tsx:39`, `AppSettingsPage.tsx:262`) and `npm run dev` showed a white screen. Diagnosed and fixed both. Four changes in this push:

### 1. `settings.service.ts` — Zod `.optional()` vs `exactOptionalPropertyTypes`
Zod's `.optional()` infers `T | undefined` but `Settings` declares `profile?: UserProfileSettings` (no `| undefined`). Cast via `unknown` after `SettingsSchema.parse(...)` — the schema has already validated the shape so this is safe, and it's the least-surface fix.

### 2. `ThemeStorageStep.tsx:39` and `AppSettingsPage.tsx:262` — `defaultPath: x || undefined`
Same exact-optional problem. Replaced `defaultPath: storagePath || undefined` with a conditional spread `...(storagePath ? { defaultPath: storagePath } : {})`. The dialog IPC's optional param now gets omitted rather than set to `undefined`.

### 3. White-screen root cause — Tailwind classes that don't exist
I'd been using `bg-accent-primary` / `text-accent-error` / `border-accent-primary` / `border-accent-error` / `border-border-subtle` throughout D21–D24. The Tailwind config only had `accent.DEFAULT/light/dark` and no `border` namespace. Silent-fail on unknown class names meant buttons rendered with no background, borders didn't draw, and the initial `App.tsx` loading div (`bg-surface-primary` = `#FFFFFF`) showed as a blank white page until IPC resolved — with no text to indicate progress.

Fixed in `tailwind.config.js`:
- Added `accent.primary` (alias of DEFAULT) and `accent.error` (reuses `var(--color-fail)`)
- Added `border` namespace: `DEFAULT` + `subtle` both → `var(--border-default)`

### 4. `App.tsx` — fail-open splash + error boundary
- Placeholder div now shows `"Loading Vision-EviDex…"` text so it's not a blank white rectangle even if IPC is slow.
- Added try/catch around `settings.get`. Any error (missing preload bridge, IPC failure) sets `onboardedInSettings=false` and shows a top banner with the error text instead of hanging on the placeholder.
- Wrapped the shell in a local `AppErrorBoundary` — any render crash now renders a red-bordered card with the stack trace instead of a white screen. `console.error` is called too so DevTools captures the trace.

### Please run

```powershell
git pull
npm run report
```

Expected:
- typecheck PASS (3 errors gone)
- tests still **~210/210 PASS** (no test logic changed)
- bench / audit unchanged

Then `npm run dev`:
- Brief "Loading Vision-EviDex…" splash
- Onboarding wizard visible — 7 steps starting at Welcome tour (none mode)
- Buttons now have colors (accent-primary fills, error-coloured validation messages)
- Card borders and Next/Back divider lines visible

If anything still fails, the AppErrorBoundary will render the stack trace visibly. Please paste that + the DevTools console into `INBOX-TO-CTS.md`.

---

## 2026-04-18 — D25 Friday gate: full Phase 1 Week 5 verification

**From:** CTS (Claude Code)
**Commit range from your last verified tip `10fa1ca` (D20):**
- `03d11d5` D21 — onboarding Steps 1–4 (licence, tour, profile, branding) + validators
- `4d7559b` D22 — onboarding Steps 5–8 + settings:*/branding:*/dialog IPC + Finish persistence
- `3b1b87c` D23 — DashboardPage + MetricsService + onboarding-gated routing
- `64b56b3` D24 — AppSettingsPage 6-tab + nav-store

Five days, four commits, bundled. Summary of what landed:

### New IPC channels (8 live / 15 stub after this push)
- `settings:get`  → SettingsService.getSettings()
- `settings:update` → SettingsService.saveSettings(partial)
- `branding:save` → DatabaseService.saveBrandingProfile (INSERT / UPSERT)
- `dialog:selectDirectory` → Electron dialog.showOpenDialog (openDirectory)
- `metrics:summary` → MetricsService.summary()
- `recentProjects:list` → DatabaseService.getRecentProjects()

### Schema expansions
- `Settings` now carries: `theme`, `defaultStoragePath`, `defaultTemplateId`, optional `profile`, optional `hotkeys`, optional `brandingProfileId`. Old settings.json shapes fall back to defaults on load (non-destructive).
- `LicenceValidationResult` now additively includes `mode: 'keygen' | 'none'` so the About/Licence tab can render correctly.

### New renderer
- **Onboarding wizard** — 7 real step components (or 8 in keygen mode):
  - `LicenceStep` (keygen-only): calls `licence:activate`, masks key `****-****-****-LAST4`
  - `WelcomeTourStep`: 3-screen fade carousel via Framer Motion
  - `UserProfileStep`: name/role/team/email
  - `BrandingStep`: company / logo (PNG/JPG ≤ 2 MB → base64) / colour / header+footer
  - `DefaultTemplateStep`: radio grid of 5 built-in templates
  - `HotkeyConfigStep`: 6 actions with click-to-remap + live conflict highlighting
  - `ThemeStorageStep`: 3-way theme + storage path picker via dialog IPC
  - `SummaryStep`: read-only recap with Edit-links; Finish persists via `persistOnboarding()` (fails-closed: branding save must succeed before settings update)
- **DashboardPage** (S-03) — metrics panel (4 cards), quick links (4 buttons), recent projects list (empty-state CTA), Settings button top-right.
- **AppSettingsPage** (S-23) — 6 tabs: Profile / Hotkeys / Appearance / Storage / Defaults / Licence (label becomes "About" in none mode). Each tab reads from settings:get, writes via settings:update.
- **App routing gate**: mount-time `settings:get` → render Dashboard when `onboardingComplete`, else Onboarding. `nav-store` toggles Dashboard ↔ AppSettings.

### Please run (default cadence)

```powershell
git pull
npm run report
```

Expected:
- typecheck PASS
- tests **~210/210 PASS** (140 prior + ~70 new across D21–D24)
- PBKDF2 bench PASS
- dep-audit baseline unchanged (0 / 5 / 0 / 3)
- exit 0

Then optionally `npm run dev` — you'll see:
1. Onboarding wizard on first boot (none mode, 7 steps starting at Welcome tour)
2. Walk through all steps, fill forms, click **Finish** on Summary
3. Auto-transitions to Dashboard showing 0 recent projects + "Create your first project" empty state
4. Click **Settings** top-right → AppSettings with 6 tabs, each reflecting what you just saved
5. Click **← Dashboard** to return

Close and relaunch: app should boot straight into Dashboard (gate honours persisted `onboardingComplete: true`). Delete `%APPDATA%\VisionEviDex\settings.json` to reset.

### D25 gate

All green → CTS proceeds to Phase 1 Week 6 (Project Manager D26–D30: create/open/close project flows, `.evidex` lifecycle wired to the container service).

If any test or typecheck fails, paste the Pre-checks section from `latest.md` into `INBOX-TO-CTS.md`; I'll fix per failure.

---

## 2026-04-18 — D20 verification: onboarding wizard skeleton

**From:** CTS (Claude Code)
**What landed:** Phase 1 Wk4 D20 — final Wk4 day. Onboarding wizard UI shell + state machine. Real step content + settings IPC gate are Wk5 D21+.

### Files

- `src/renderer/stores/onboarding-store.ts` — Zustand vanilla-capable store: 8 step definitions (1 gated on keygen mode), `next/back/skip/goTo/complete/reset` actions, per-step `data` map for future form payloads. Selectors (`selectVisibleSteps`, `selectCurrentStep`, `selectIsFirst/Last`) let components subscribe narrowly.
- `src/renderer/pages/OnboardingPage.tsx` — rewrite of the stub: full wizard UI with step counter, title/description, placeholder body, Back/Next/Skip/Finish controls wired to the store. Reset button on the completion screen for easy re-runs during dev.
- `src/renderer/App.tsx` — now renders OnboardingPage unconditionally. The "only-if-not-onboarded" gate needs `settings:*` IPC which doesn't exist yet; that's D21+.
- `__tests__/onboarding-store.spec.ts` — 15 pure-state tests: mode-based step filtering (7 vs 8), navigation clamps (next/back at bounds, goTo range check), skip-as-next, setStepData merge, complete flag, reset, setMode clamps currentIndex when step count shrinks.

### Please run (default cadence)

```powershell
git pull
npm run report
```

Expected:
- typecheck PASS
- tests **~140/140 PASS** (125 prior + 15 new onboarding-store)
- PBKDF2 bench PASS
- dep-audit baseline unchanged
- exit 0

Then optionally `npm run dev` to eyeball the wizard — you'll see the onboarding card instead of the Phase 0 scaffold card. Clicking Next walks through 7 steps (none mode) with placeholder content; Finish lands on the completion screen.

### Gate — Week 4 closes

If D20 is green, that closes Phase 1 Week 4 (D16 licence → D20 onboarding skeleton). Next sprint is Wk5 (onboarding real forms + dashboard shell + app settings screen, D21–D25).

---

## 2026-04-18 — D19 verification: ManifestService + NamingService

**From:** CTS (Claude Code)
**What landed:** Phase 1 Wk4 D19 — SHA-256 integrity check + filename token substitution.

### Files

- `src/main/services/manifest.service.ts` — thin wrapper over EvidexContainerService for append/read/integrityCheck. Single-slot guard: every call verifies the open container's projectId matches.
- `src/main/services/naming.service.ts` — stateless, 10 tokens per Tech Spec §13 (`{ProjectCode}`, `{ClientCode}`, `{TestID}`, `{TesterInitials}`, `{Date}`, `{Time}`, `{Seq}`, `{Status}`, `{ModuleCode}`, `{Env}`). Unknown tokens pass through verbatim. Windows-invalid chars are sanitised. UTC timestamps for deterministic naming across timezones.
- `__tests__/naming-service.spec.ts` — 19 cases covering every token + DEFAULT_PATTERN + empty-pattern fallback + unknown-token pass-through + sanitisation + preview + validate.
- `__tests__/manifest-service.spec.ts` — 10 cases: append/read roundtrip, container save+reopen preservation, integrityCheck all-pass / hash-mismatch / missing-image / mixed, single-slot guards.

### Please run (default cadence)

```powershell
git pull
npm run report
```

Expected:
- typecheck PASS
- tests **~124/124 PASS** (95 prior + 29 new — 19 naming + 10 manifest)
- PBKDF2 bench PASS
- dep-audit baseline unchanged
- exit 0

### Gate

D19 PASS → CTS proceeds to **D20** (Friday Asus run + onboarding React skeleton). That closes Phase 1 Wk4.

---

## 2026-04-18 — D18 verification: project-DB schema + full CRUD

**From:** CTS (Claude Code)
**What landed:** Phase 1 Wk4 D18 — 9-table project-DB schema, migration runner, ~20 prepared-statement methods replacing D14's stubs.

### Files

- `src/main/migrations/001_initial_schema.ts` — SQL for all 9 tables (projects, sessions, captures, annotation_layers, sign_offs, import_history, access_log, version_history, schema_migrations) + indexes.
- `src/main/migrations/index.ts` — `PROJECT_MIGRATIONS` registry (frozen array).
- `src/main/services/database.service.ts` — full rewrite:
  - `initProjectSchema()` migration runner (wraps each migration in a transaction).
  - `getAppliedMigrations()`, `walCheckpoint()` helpers.
  - Real prepared statements for every project-DB method the D14 stubs threw on.
  - Append-only discipline: `sign_offs` / `access_log` / `version_history` have insert + get only; no update/delete methods (Rule #5, test-verified).
  - Templates / branding / metrics stubs remain phase-labelled (Wk5 / Phase 3).
- `__tests__/database-service.spec.ts` — expanded from 4 to ~30 cases covering migrations, projects, sessions (incl. FK constraint), captures, annotation_layers, sign_offs, access_log, version_history, import_history, and architectural absence of update/delete methods.

### Please run (default cadence)

```powershell
git pull
npm run report
```

Expected:
- typecheck PASS
- tests **~96/96 PASS** (68 prior + ~28 new DB cases)
- PBKDF2 bench: PASS (~90ms on your hardware)
- dep-audit: baseline unchanged
- exit 0

### If anything fails

`latest.md` Pre-checks section now shows the first failing test name automatically. Paste that section into `INBOX-TO-CTS.md` and I'll fix.

### Gate

D18 PASS → CTS proceeds to **D19** (ManifestService SHA-256 hash-recompute integrity check + NamingService token substitution).

---

## 2026-04-18 — D17 close: PBKDF2 bench now runs inside `npm run report`

**From:** CTS (Claude Code)
**Context:** Your manual `npm run bench:pbkdf2` at `d94f45d` came back PASS — mean 91 ms vs 800 ms budget. Thank you. Rather than rely on a one-off command, the benchmark is now part of the standard report pipeline. Every `git pull` → `npm run report` will refresh Risk R-07 data automatically.

### What changed in this push

- `scripts/benchmark-key-derivation.js` — exports `runBenchmark()` for reuse; standalone `npm run bench:pbkdf2` still works as before.
- `scripts/run-report.js` — after tests, runs the PBKDF2 bench, appends to `run-reports/sprint0-benchmark.json`, adds a **Benchmarks** table to `latest.md`, adds `pbkdf2_max_ms` to each `benchmarks.jsonl` line.
- **Non-gating:** exit code unchanged. Only appends a WARN to `next_actions` when max > 800 ms. Trend in `sprint0-benchmark.json` is the authoritative signal.

### Please run (default cadence)

```powershell
git pull
npm run report
```

Expected for this run (tip `f9dbd95`):

- Pre-checks: typecheck PASS, tests **68/68 PASS**.
- **New "Benchmarks" section in `latest.md`** with a one-row PBKDF2 table: max ≈ 90-100 ms, Status `PASS`.
- `run-reports/sprint0-benchmark.json` gains a 2nd entry (first was the manual run).
- `benchmarks.jsonl` last line includes `"pbkdf2_max_ms": <number>`.
- Exit 0.

No separate bench command needed. If any pre-check fails or bench shows WARN, the exact error / measurement will be in `latest.md` — just push back `run-reports/` + `STATUS.md` as usual.

### Gate

All green → CTS proceeds to **D18** (project SQLite schema + full DatabaseService CRUD + migration runner, Architecture §5.2).

---

## 2026-04-18 — D17 verification: EvidexContainerService + PBKDF2 benchmark

**From:** CTS (Claude Code)
**What landed:** AES-256-GCM crypto layer + JSZip-backed container service + Risk R-07 benchmark script.

### Files

- `src/main/services/container-crypto.ts` — PBKDF2-SHA256 (310k iter) + AES-256-GCM with random IV and 128-bit tag. Byte layout: `[magic(4)=EVDX][ver(1)][salt(16)][iv(12)][tag(16)][cipher…]`. Typed `ContainerCryptoError` codes for BAD_MAGIC / UNSUPPORTED_VERSION / TRUNCATED / AUTH_TAG_MISMATCH / DECRYPT_FAILED.
- `src/main/services/evidex-container.service.ts` — full rewrite. Single-slot per Rule 11. In-memory entry map; `save()` does atomic `.tmp` → copy prior to `.bak` → rename (Tech Spec §7.2 steps 2–6). Steps 1 (WAL checkpoint) + 7 (version_history row) wait for D18's project DB.
- `scripts/benchmark-key-derivation.js` — 5-sample PBKDF2 timing with one warm-up. Budget: 800 ms max. Result appended to `run-reports/sprint0-benchmark.json`.
- New npm dep: `jszip@^3.10.1` (pure JS, no native rebuild needed).
- New npm script: `npm run bench:pbkdf2`.
- Tests: `container-crypto.spec.ts` (13 cases), `evidex-container-service.spec.ts` (12 cases).

### Please run

```powershell
git pull
npm install         # pulls jszip
npm run bench:pbkdf2
npm run report
npm run dev
```

Expected:

1. **`npm install`** — adds jszip silently (no native compile).
2. **`npm run bench:pbkdf2`** — prints `[pbkdf2-bench] min=XXXms mean=YYYms max=ZZZms budget=800ms PASS`. Writes `run-reports/sprint0-benchmark.json`. Exit 0 only when max < 800 ms.
3. **`npm run report`** — typecheck PASS, tests **~67/67 PASS** (42 prior + 25 new). Dep-audit unchanged. Exit 0.
4. **`npm run dev`** — unchanged behaviour (no container is opened during dev; container wiring into `app.ts` lands when the project manager UI arrives in Wk6). Log lines identical to D16.

### If bench FAILs

Paste the `[pbkdf2-bench]` output line and the last entry of `run-reports/sprint0-benchmark.json` into `INBOX-TO-CTS.md`. We'll need to discuss whether to drop iterations (lose brute-force resistance) or accept the UX cost.

### Gate

D17 PASS → CTS proceeds to D18 (project SQLite schema + DatabaseService for sessions/captures/manifest). The container's placeholder entries will be joined by the real `project.db` file there.

---

## 2026-04-18 — D16 fixup: update stub-era ipc-router test

**From:** CTS (Claude Code)
**Context:** Your D16 run reported 40/41 pass; the one failure was a
D13-era assertion in `__tests__/ipc-router.spec.ts:92` that still
expected the `licence:validate` stub to return `null`. D16 wired that
channel to the real service, which returns `{ valid: true }` through
the mock.

### Change

- Renamed the test to "routes licence:validate with {} through the real
  service" and updated the assertion to `{ ok: true, data: { valid: true } }`.
- Added a companion test: "routes licence:activate with a valid key
  through the real service" → `{ ok: true, data: { success: true } }`.

### Please run

```powershell
git pull
npm run report
```

Expected: typecheck PASS, tests **42/42 PASS**, exit 0.

### Gate

All green → D17 (EvidexContainerService AES-256-GCM + PBKDF2 benchmark).

---

## 2026-04-18 — D16 verification: real LicenceService landed

**From:** CTS (Claude Code)
**What landed:** Phase 1 Wk4 D16 — LicenceService real keygen path, Ed25519 offline verify, machine fingerprint binding, routed through IPC.

### Files added/changed

- `src/main/services/machine-fingerprint.ts` — sha256(machine-id) helper
- `src/main/services/licence-token.ts` — JWT-style parse + Ed25519 verify + expiry
- `src/main/services/licence.service.ts` — rewrite: constructor-injected config, `none`/`keygen`/`dev` branches, atomic `licence.sig` write, HTTP activate via Keygen.sh `/validate-key`
- `src/main/ipc-router.ts` — `registerAllHandlers(services)` now takes a `ServiceRegistry`; `licence:activate` + `licence:validate` route through the real service
- `src/main/app.ts` — construct `LicenceService` from env (`EVIDEX_LICENCE_MODE`, `EVIDEX_KEYGEN_PUBLIC_KEY`, `EVIDEX_KEYGEN_ACCOUNT_ID`); log `licence.validate` result; gate-miss logged (activation window is D20)
- 3 new test files: `licence-service.spec.ts` (15 cases), `licence-token.spec.ts` (9 cases), `machine-fingerprint.spec.ts` (2 cases)
- `ipc-router.spec.ts` — updated to pass a mock `ServiceRegistry`

### Please run

```powershell
git pull
npm run report
```

Expected:
- Pre-checks: typecheck PASS, tests **~44/44 PASS** (18 prior + 26 new across 3 files).
- Dep-audit unchanged (0 / 5 / 0 / 3).
- Exit 0.

Then:
```powershell
# Still default none mode — licence.sig never created
npm run dev
```
DevTools log lines should include:
- `{"msg":"licence.validate","meta":{"mode":"none","valid":true}}`
- No `licence.gate-miss` warning (because none mode is always valid).

### Optional — exercise keygen mode locally (no real Keygen account required)

```powershell
# Generate a local Ed25519 keypair once
node -e "const c=require('crypto'); const p=c.generateKeyPairSync('ed25519'); console.log(p.publicKey.export({type:'spki',format:'pem'}));"
```

Set `EVIDEX_LICENCE_MODE=keygen` and the printed PEM as `EVIDEX_KEYGEN_PUBLIC_KEY` before `npm run dev`. Expect:
- `licence.validate` to log `valid:true` anyway because `isDev === true` short-circuits in unpackaged builds.
- If you force-exit the isDev path (out of scope today), you would see `valid:false, reason:"no licence file present"` and the `licence.gate-miss` warning.

### Push back

Just `run-reports/` + `STATUS.md`. If any precheck fails, append to `INBOX-TO-CTS.md`.

### Gate

D16 PASS → CTS proceeds to D17 (EvidexContainerService: AES-256-GCM create/encrypt/atomic-save + 800 ms PBKDF2 benchmark).

---

## 2026-04-18 — D15 retry 2: drop --build-from-source (no VS C++ needed)

**From:** CTS (Claude Code)
**Context:** Your last run showed `pretest` failing because
`npm rebuild better-sqlite3 --build-from-source` invokes `node-gyp`,
which needs Visual Studio C++ Build Tools you do not have installed.

### What changed

- `package.json` — `rebuild:node` is now `npm rebuild better-sqlite3`
  (no `--build-from-source`). better-sqlite3's install script tries
  `prebuild-install` first and only falls back to `node-gyp` if no
  matching prebuilt binary exists. For Node v22 x64 Windows a prebuilt
  exists, so `node-gyp` should never run on your machine.
- `scripts/run-report.js` — `runTests()` now captures stderr when
  vitest never starts, so "Pre-checks" in `latest.md` will show the
  real error line instead of "could not parse vitest JSON output".

### Please run

```powershell
git pull
npm run report
```

Expected this time:
- `pretest` downloads the Node prebuild for better-sqlite3 (no compile).
- Typecheck PASS.
- Tests PASS, **18/18**.
- Dep-audit unchanged (0 critical / 5 high / 0 moderate / 3 low).
- `npm run report` exits **0**.

Then:
```powershell
npm run dev
```
Boot still works because `predev` → `electron-rebuild` swaps the ABI
back to Electron transparently.

### If tests still fail

Paste the new `Pre-checks` section of `latest.md` into `INBOX-TO-CTS.md`.
The stderr-tail capture should now include the exact blocker.

### Gate

All green → Wk3 closed, CTS starts D16 (Phase 1 Wk4 — LicenceService real path).

---

## 2026-04-18 — D15 retry: fix TS errors + ABI rebuild hooks + gated run-report

**From:** CTS (Claude Code)
**Commit to verify:** tip of `main` after this push

### Changes in this push

1. **TS2375 / TS2412 fixes** under `exactOptionalPropertyTypes`:
   - `src/shared/types/errors.ts:16` → conditional assignment when `fields !== undefined`.
   - `src/main/ipc-router.ts:45` → conditional spread of `fields` into `IpcError`.
2. **ABI rebuild hooks** in `package.json`:
   - `predev` → `rebuild:electron` (runs before `npm run dev`).
   - `pretest` → `rebuild:node` (runs before `npm test`).
   - Manual: `npm run rebuild:electron` / `npm run rebuild:node`.
3. **`scripts/run-report.js` extended** (Option B):
   - Runs `npm run typecheck` and `npm test` as **gating pre-checks**.
   - Writes `prechecks` block into `run-reports/latest.json`.
   - New "Pre-checks" table in `run-reports/latest.md`.
   - Appends `typecheck` / `tests` keys to each `benchmarks.jsonl` line.
   - Exits 1 if typecheck or tests fail (in addition to the existing module-FAIL gate).

### Please run on Asus

```powershell
git pull
npm run report
```

That single command should now:
- rebuild better-sqlite3 for Node (via `pretest`),
- run `npm run typecheck` (expect PASS — the 2 TS errors from previous run are fixed),
- run `npm test` (expect 18/18 PASS),
- run `npm audit --omit=dev` (expect 8 vulns baseline unchanged),
- write the new Pre-checks section into `run-reports/latest.md`,
- exit 0.

Then:
```powershell
npm run dev
```
(the `predev` hook rebuilds for Electron automatically — no ABI mismatch expected)

Expected in DevTools Console after `npm run dev`:
- `[ipc-router] 17 stub handlers registered`
- `{"msg":"app.ready",...}`
- `{"msg":"services.ready","meta":{"onboardingComplete":false,"appDbPath":"..."}}`
- `{"msg":"licence.validate","meta":{"mode":"none","valid":true}}`

### Push back

- `run-reports/` + `STATUS.md` via `git push`.
- If the new `Pre-checks` section shows any FAIL, also append a quick note in `INBOX-TO-CTS.md` with the failing test name or TS error — CTS will fix in code.

### Gate

All green → Wk3 gate closed, CTS proceeds to **D16** (Phase 1 Wk4 — LicenceService real path).

---

## 2026-04-18 — D15 Phase 1 Week 3 gate — Electron shell first boot

**From:** CTS (Claude Code)
**Commit to verify:** `423648f` (tip of `main`)
**Pull range from your last known tip `a275ec0`:**
`fa59a5f` audit wire · `ab8f596` D11 app.ts · `c44edd7` D12 WindowManager · `b3dbfa6` D13 IPC router + Wk3 security test · `423648f` D14 SettingsService + app.db

### Setup (once)

```powershell
cd C:\path\to\vision-evidex
git pull
# No new native deps added — better-sqlite3 was already present.
# If you see "Module version mismatch" for better-sqlite3 on first
# `npm run dev`, run `npx electron-rebuild` once and retry.
```

### Verification checklist — tick each with PASS/FAIL in your INBOX-TO-CTS reply

1. **Typecheck**
   ```
   npm run typecheck
   ```
   Expect: exits 0, zero TS errors.

2. **Unit tests**
   ```
   npm test
   ```
   Expect: **3 spec files, ~22 cases, all pass.**
   - `__tests__/ipc-router.spec.ts` — 7 cases (channel count, VALIDATION_FAILED paths, refinement errors)
   - `__tests__/settings-service.spec.ts` — 7 cases (atomic write, defaults, corrupted-file fallback)
   - `__tests__/database-service.spec.ts` — 4 cases (schema idempotency, upsert, DESC ordering)

3. **Electron dev boot**
   ```
   npm run dev
   ```
   Expect:
   - Main window opens with Phase 0 scaffold card.
   - DevTools Console shows:
     - `[ipc-router] 17 stub handlers registered`
     - A JSON log line `{"ts":"…","level":"info","msg":"app.ready",…}`
     - A JSON log line `{"ts":"…","level":"info","msg":"services.ready","meta":{"onboardingComplete":false,"appDbPath":"…"}}`
     - `{"ts":"…","level":"info","msg":"licence.validate","meta":{"mode":"none","valid":true}}`
   - DevTools → Network → click a request → `Content-Security-Policy` header present, `connect-src 'none'`.
   - `%APPDATA%\VisionEviDex\` now contains:
     - `app.db` (+ `app.db-wal`, `app.db-shm` while running)
     - `logs\app-2026-04-18.log` with the three JSON lines above
     - `settings.json` is **NOT** yet created on first boot (intentional — only written when `saveSettings` is called; Week 5 onboarding will be the first writer).
   - Close the window, Electron process exits cleanly (`app.will-quit` line appears in the log).

4. **IPC round-trip sanity (DevTools Console in the renderer)**
   Paste each line and report the return value:
   ```js
   await window.evidexAPI.licence.validate();
   // Expect: { ok: true, data: null }

   await window.evidexAPI.session.create({});
   // Expect: { ok: false, error: { code: "VALIDATION_FAILED", message: "Input validation failed", fields: { /* many */ } } }

   await window.evidexAPI.session.create({
     projectId: "p", testId: "t", testName: "smoke",
     environment: "QA", testerName: "Asus", applicationUnderTest: "x"
   });
   // Expect: { ok: true, data: null }
   ```

5. **Other three windows open on demand** — open an Electron DevTools console in the main process (or temporary dev shim) and call each of `createToolbarWindow()`, `createAnnotationWindow()`, `createRegionWindow()` once. Each must appear and close cleanly. *Optional* — renderer pages are stub `App.tsx` placeholders, so a blank frame is the expected visual.

6. **Dependency audit trend**
   ```
   npm run report
   ```
   Expect:
   - `run-reports/latest.md` has a new **Dependency audit (prod)** section with counts matching the previous run (5 high still expected; no new criticals).
   - `run-reports/benchmarks.jsonl` last line has `"audit":{…}`.
   - Exit code 0 (audit findings are non-gating).
   - `STATUS.md` updated, `run-reports/history/…` archived correctly.

### Push back

- `run-reports/` + `STATUS.md` as usual.
- If any of checks 1–6 fails, log the exact error (command + stack) in `INBOX-TO-CTS.md` with the step number. Don't try fixes on Asus — CTS will address in code.

**Gate:** All 6 checks must PASS before starting Week 4 (LicenceService real path + EvidexContainerService + per-project DB).

---

## 2026-04-18 — Please verify new dependency-audit step in `npm run report`

**From:** CTS (Claude Code)
**Action:** Validate that the modified [scripts/run-report.js](scripts/run-report.js) behaves correctly on the Asus TUF.

Changes in this push:
1. `run-report.js` now shells out to `npm audit --omit=dev --json` and records counts in:
   - `run-reports/latest.json` → new `dependencyAudit` field
   - `run-reports/latest.md` → new "Dependency audit (prod)" section
   - `run-reports/benchmarks.jsonl` → new `audit` key per line
2. Next-action line is appended when `high > 0` or `critical > 0` (currently expected: 5 high).
3. Exit code logic is **unchanged** — audit findings never FAIL the run. Only `modules[].status==='FAIL'` gates exit 1.
4. Three Phase 1 security gates added to [BACKLOG.md](BACKLOG.md).

**Please run on Asus:**
1. `npm run report`
2. Confirm exit 0, `latest.md` shows 18 SKIP + the new dependency-audit table with non-zero high count.
3. Confirm `benchmarks.jsonl` last line contains `"audit":{...}`.
4. Push back `run-reports/` + `STATUS.md` as usual.

**Priority:** Do before first Phase 1 Week 3 commits so the trend baseline starts recording immediately.

---

## 2026-04-17 — Initial scaffold push

**From:** CTS (Claude Code)
**Action:** Please perform first-run setup on the Asus TUF.

1. Follow [ASUS-FIRST-RUN.md](ASUS-FIRST-RUN.md) step-by-step.
2. Run `scripts\setup-asus.ps1` and capture any failures.
3. Run `npm run dev` and confirm the Phase 0 scaffold card renders with "Licence: valid" and "Phase: 0 — scaffold".
4. Run `npm run report` and push `run-reports/` + `STATUS.md` back.
5. If `electron-rebuild` fails on native modules (better-sqlite3, sharp), this is Risk R-04. Log the exact error in [INBOX-TO-CTS.md](INBOX-TO-CTS.md) — do not try workarounds yet.

**Expected outcome on first run:** all 18 modules report SKIP (nothing implemented), exit code 0, `latest.md` lists "Phase 0 scaffold — module not implemented yet" per module.

**Priority:** Must complete before any Phase 1 work begins.
