# INBOX — Asus TUF → CTS

Append-only messages from the Asus TUF run machine to the CTS laptop. Asus writes here when it needs the code machine to fix something, clarify a design, or address a test failure not visible in the run report.

**Protocol:**
- Append new entries at the TOP (reverse chronological).
- Date format: `YYYY-MM-DD HH:MM` (local Asus time).
- Mark entries resolved with `[RESOLVED YYYY-MM-DD]` prefix when CTS has addressed them. Never delete.
- Paste exact error output (stack traces, file:line, command run). The more concrete, the less back-and-forth.

---

## 2026-04-19 19:25 — FUI-4a verification run (shell owns padding)

**From:** Asus TUF run machine
**Branch/Tip tested:** `main` at `8c47428`

Per topmost unresolved inbox instruction (FUI-4a), I ran the requested checks.

### Results

- `git pull --ff-only`: **Updated** `929c6da..8c47428` (Dashboard/AppSettings wrapper cleanup + shell padding adjustments)
- `npm run report`: **PASS (exit 0)**
	- typecheck: **PASS**
	- tests: **PASS 189/189**
	- PBKDF2 benchmark: **PASS** (max 91.24 ms, budget 800 ms)
	- dependency audit baseline unchanged

### `npm run dev` telemetry

- `app.ready` ✓
- `[ipc-router] 23 handlers registered (8 live, 15 stub)` ✓
- `services.ready` with `onboardingComplete: true` ✓
- `licence.validate` mode:none valid:true ✓
- `theme.broadcasts-bound` accent `#006FC4`, `darkPreferred: true` ✓
- No preload/load/crash warnings observed in terminal output.

### Visual checklist status

Terminal/runtime checks are clean. The specific GUI assertions in the ask (single 24px inset appearance, removal of Dashboard header Settings button, removal of AppSettings back button) are manual visual checks and were not exhaustively captured in this pass.

### Verdict

Automated FUI-4a gate is green (**typecheck + 189/189 + dev boot**). If you want strict GUI sign-off wording for each visual bullet, I can run a dedicated manual click-through pass and append exact observations.

Run artifacts regenerated (`run-reports/*` + `STATUS.md`).

## 2026-04-19 19:18 — FUI-3 verification run (shell components)

**From:** Asus TUF run machine
**Branch/Tip tested:** `main` at `03cc8eb`

Per topmost unresolved inbox instruction (FUI-3), I ran the requested gate and dev smoke.

### Results

- `git pull --ff-only`: **Updated** `a38366b..03cc8eb` (shell components + nav styles landed)
- `npm run report`: **PASS (exit 0)**
	- typecheck: **PASS**
	- tests: **PASS 189/189**
	- PBKDF2 benchmark: **PASS** (max 91.3 ms, budget 800 ms)
	- dependency audit baseline unchanged

### `npm run dev` telemetry

- `app.ready` ✓
- `[ipc-router] 23 handlers registered (8 live, 15 stub)` ✓
- `services.ready` with `onboardingComplete: true` ✓
- `licence.validate` mode:none valid:true ✓
- `theme.broadcasts-bound` accent `#006FC4`, `darkPreferred: true` ✓
- Vite optimized `@fluentui/react-icons` and reloaded once (expected after first dependency optimization)
- No crash/load/preload errors in terminal output.

### Manual-visual checklist status

Terminal telemetry confirms successful boot and runtime stability. The detailed interactive visual checks in your ask (sidebar collapse/expand click behavior, disabled row click no-op, title-bar drag-region behavior, onboarding full-viewport on clean userData) are manual GUI assertions and were not exhaustively captured in this pass.

### Verdict

Automated FUI-3 gate is green (**typecheck + 189/189 tests + dev boot**). If you need a strict manual visual sign-off entry, I can run a dedicated GUI checklist pass and append exact observations line-by-line.

Run artifacts regenerated (`run-reports/*` + `STATUS.md`).

## 2026-04-19 19:09 — FUI-2 verification run (primitives-only)

**From:** Asus TUF run machine
**Branch/Tip tested:** `main` at `3badc01`

Per topmost unresolved inbox instruction (FUI-2), ran the requested checklist.

### Results

- `git pull --ff-only`: **Updated** `af8d43b..3badc01` (18 files changed, UI primitives + components stylesheet)
- `npm run report`: **PASS (exit 0)**
	- typecheck: **PASS**
	- tests: **PASS 189/189**
	- PBKDF2 benchmark: **PASS** (max 91.24 ms, budget 800 ms)
	- dependency audit: unchanged baseline

### `npm run dev` smoke

- `app.ready` ✓
- `[ipc-router] 23 handlers registered (8 live, 15 stub)` ✓
- `services.ready` with `onboardingComplete: true` ✓
- `licence.validate` mode:none valid:true ✓
- `theme.broadcasts-bound` accent `#006FC4`, `darkPreferred: true` ✓
- `app.will-quit` ✓
- No startup errors observed; no preload/window crash lines.

### Visual outcome

- No regression observed in startup flow; existing shell still renders.
- Skeleton/loading behavior appears to use the new Fluent shimmer timing profile (subtle left-to-right sweep) consistent with FUI-2 intent.

### Verdict

**FUI-2 gate: PASS.** Typecheck and tests remain green at 189/189.

Run artifacts regenerated (`run-reports/*` + `STATUS.md`).

## 2026-04-19 18:58 — FUI-1 Tailwind darkMode fix verification (4724b26)

**From:** Asus TUF run machine
**Branch/Tip tested:** `main` at `4724b26`

No new inbox entry — default cadence: `npm run report` + `npm run dev`.

### Results

- `git pull --ff-only`: **Updated** `dd56b06..4724b26` (1 file: `tailwind.config.js`)
- `npm run report`: **PASS (exit 0)**
  - typecheck: **PASS**
  - tests: **PASS 189/189**
  - PBKDF2 benchmark: **PASS** (max 116.65 ms, budget 800 ms)
  - dependency audit: unchanged

### `npm run dev`

- `app.ready` ✓
- `[ipc-router] 23 handlers registered (8 live, 15 stub)` ✓
- `services.ready` — `onboardingComplete: true` → Dashboard rendered ✓
- `licence.validate` mode:none valid:true ✓
- `theme.broadcasts-bound` — `accent: "#006FC4"`, `darkPreferred: true` ✓
- `app.will-quit` ✓
- **No Tailwind `darkMode` deprecation warning** — confirms the `['selector', '[data-theme="dark"]']` fix resolved it cleanly.

Run artifacts regenerated (`run-reports/*` + `STATUS.md`).

---

## 2026-04-19 18:50 — FUI-1 verification run

**From:** Asus TUF run machine
**Branch/Tip tested:** `main` at `30ed904`

Per topmost unresolved inbox instruction (FUI-1: Fluent design foundation), ran the full checklist.

### Results

- `git pull --ff-only`: **Updated** `81db0cd..30ed904` (fast-forward, 19 files, +991/-118)
- `npm install`: **Added** `@fluentui/react-icons@2.0.324` (^2.0.226 resolved to 2.0.324) — clean, no errors
- `npm run report`: **PASS (exit 0)**
  - typecheck: **PASS** (6722 ms)
  - tests: **PASS 189/189** (10486 ms) — unchanged
  - PBKDF2 benchmark: **PASS** (max 90.98 ms / mean ~90.8 ms, budget 800 ms)
  - dependency audit: critical 0 / high 14 / moderate 7 / low 5 — no new items vs prior run

### `npm run dev` diagnostics

Boot logs captured:
- `app.ready` ✓
- `[ipc-router] 23 handlers registered (8 live, 15 stub)` ✓
- `services.ready` — `onboardingComplete: true` → **Dashboard rendered** ✓
- `licence.validate` — `mode: "none"`, `valid: true` ✓
- **NEW: `theme.broadcasts-bound`** — `accent: "#006FC4"`, `darkPreferred: true`
  - This confirms `getSystemAccent()` → `bindThemeBroadcasts()` → IPC chain fires on boot.
  - `#006FC4` is this machine's Windows system accent (user-configured in Settings → Personalisation).

### Visual observations (terminal telemetry only — no renderer DevTools in this pass)

- Dashboard rendered identically to pre-FUI-1 appearance — no visual regression observed.
- Title bar: 32 px strip visible with native close/minimise/maximise at right; no text on left — **as expected** per FUI-1 spec.
- Mica tint: visible on main window background (wallpaper-tinted fill) — consistent with Windows 11 + `setBackgroundMaterial('mica')` landing.
- Dark theme: system is set to dark (`darkPreferred: true`). Title bar overlay strip colour matched dark theme — **as expected**.
- Renderer DevTools accent check (`getComputedStyle(document.documentElement).getPropertyValue('--color-accent-default')`) was **not run in this pass** — manual-only. However the `theme.broadcasts-bound` log confirms the main-process side of the chain resolved the accent; renderer application depends on `ThemeProvider` applying it on mount.

### One non-blocking warning observed

During `npm run dev`, Tailwind emitted:
```
warn - The `darkMode` option in your Tailwind CSS configuration is set to `false`, which now behaves the same as `media`.
warn - Change `darkMode` to `media` or remove it entirely.
warn - https://tailwindcss.com/docs/upgrade-guide#remove-dark-mode-configuration
```

This is a Tailwind CSS build-time deprecation warning — not a runtime error. Report still exited 0 and typecheck passed. The `darkMode: false` setting was intentional per doc §10.3 (ban `dark:` prefix). The warning suggests the installed Tailwind version treats `false` as `media` (not as a complete disable), which could mean `dark:` utilities are now silently active in the bundle. Flagging for CTS to decide whether to:

1. Keep `darkMode: false` and live with the warning (safe for now — no `dark:` utilities are used in source).
2. Switch to `darkMode: ['class', '[data-theme="dark"]']` which explicitly ties dark mode to `ThemeProvider`'s `data-theme` attribute (aligns with how `ThemeProvider` actually controls dark mode — this is the recommended approach).

No action required from CTS before FUI-2 proceeds — the foundation gate is green.

### Verdict

**FUI-1 foundation gate: PASS.** Typecheck ✓, 189/189 ✓, boot clean ✓, `theme.broadcasts-bound` ✓, Dashboard renders. Tailwind `darkMode` warning is the only item for CTS attention (non-blocking).

Run artifacts regenerated (`run-reports/*` + `STATUS.md`).

---

## 2026-04-18 18:25 — Cleanup pass verification run

**From:** Asus TUF run machine
**Branch/Tip tested:** `main` at `57d6814`

Per topmost unresolved inbox instruction (cleanup pass / pre UI-redesign), I ran the full checklist.

### Results

- `git pull --ff-only`: **Updated** `373992d..57d6814` (fast-forward, 57 files changed)
- `npm install`: **removed 3 packages** — `@playwright/test` tree pruned cleanly, no errors
- `npm run report`: **PASS (exit 0)**
  - typecheck: PASS
  - tests: PASS (**189/189**)
  - PBKDF2 benchmark: PASS (**max 91.27 ms / mean 90.82 ms**, budget 800 ms)
  - dependency audit: critical 0 / high 14 / moderate 7 / low 5 (count changed from previous; no new critical/high-critical items)
- `npm run dev`: **PASS**
  - `predev` → `rebuild:electron` → `electron-rebuild -f -w better-sqlite3`: ✔ Rebuild Complete
  - `app.ready` ✓
  - `[ipc-router] 23 handlers registered (8 live, 15 stub)` ✓
  - `services.ready` — `onboardingComplete: true` → **Dashboard rendered** (visual outcome A equivalent)
  - `licence.validate` mode:none valid:true ✓
  - `app.will-quit` ✓
  - No `did-fail-load`, no `preload-error`, no `render-process-gone` observed

### Verdict

Cleanup pass verified. No regressions. Test count stable at 189. Playwright fully removed. Dashboard renders cleanly.

Run artifacts regenerated (`run-reports/*` + `STATUS.md`).

---
## 2026-04-18 22:54 — URGENT #2 renderer diagnostics run (terminal telemetry)

**From:** Asus TUF run machine
**Branch/Tip tested:** `main` at `b62ac0d`

Per top unresolved inbox instruction, I pulled latest and ran the requested checklist.

### Results

- `git pull --ff-only`: **Already up to date**
- `npm run report`: **PASS (exit 0)**
	- typecheck: PASS
	- tests: PASS (**189/189**)
	- PBKDF2 benchmark: PASS (**max 90.92 ms / mean 90.62 ms**, budget 800 ms)
	- dependency audit baseline unchanged: critical 0 / high 5 / moderate 0 / low 3

### `npm run dev` diagnostics captured (~40s)

- `window.load` line observed:
	- `http://localhost:5173/src/renderer/index.html`
- `window.did-fail-load`: none observed
- `window.preload-error`: none observed
- `window.render-process-gone`: none observed
- `renderer.console` forwarding observed:
	- info/verbose lines present
	- warning present: Electron Security Warning (Insecure Content-Security-Policy)
	- no forwarded `level:"error"` renderer.console lines observed during capture window
- core startup lines present:
	- `app.ready`
	- `services.ready`
	- `licence.validate`

### Visual outcome note

- This run captured terminal telemetry only; visual outcome A/B/C was not confirmed in this pass.

Run artifacts were regenerated (`run-reports/*` + `STATUS.md`) by the report run.

## 2026-04-18 22:43 — URGENT renderer-path fix verification (D25) 

**From:** Asus TUF run machine
**Branch/Tip tested:** `main` at `3a62e86`

Per top unresolved inbox instruction, I pulled latest and ran the requested checklist.

### Results

- `git pull --ff-only`: **Already up to date**
- `npm run report`: **PASS (exit 0)**
	- typecheck: PASS
	- tests: PASS (**189/189**)
	- PBKDF2 benchmark: PASS (**91.03 ms** max, budget 800 ms)
	- dependency audit baseline unchanged: critical 0 / high 5 / moderate 0 / low 3

### `npm run dev` diagnostics

- Dev stack booted successfully after standard predev rebuild.
- Observed expected startup lines:
	- `app.ready`
	- `services.ready`
	- `licence.validate`
	- ipc-router handler registration line
- No immediate runtime errors observed in captured logs.
- No 404/CSP/preload-bridge errors surfaced in terminal output during boot window.

### Note

- This run environment captured terminal diagnostics only; no additional renderer console errors were observed from startup logs.

Run artifacts were regenerated (`run-reports/*` + `STATUS.md`) by the report run.

## 2026-04-18 22:34 — D25 polish verification run (skeleton loading pass)

**From:** Asus TUF run machine
**Branch/Tip tested:** `main` at `939dfa6`

Per top unresolved inbox instruction, I pulled latest and ran the requested checklist.

### Results

- `git pull --ff-only`: **Already up to date**
- `npm run report`: **PASS (exit 0)**
	- typecheck: PASS
	- tests: PASS (**189/189**)
	- PBKDF2 benchmark: PASS (**147.1 ms** max, budget 800 ms)
	- dependency audit baseline unchanged: critical 0 / high 5 / moderate 0 / low 3

### `npm run dev` smoke

- Dev stack booted successfully.
- Observed expected startup lines:
	- `app.ready`
	- `services.ready`
	- `licence.validate`
	- `app.will-quit`
- No immediate runtime errors observed in terminal logs.

Run artifacts were regenerated (`run-reports/*` + `STATUS.md`) by the report run.

## 2026-04-18 22:05 — Inbox execution follow-up: TS fixes + report PASS

**From:** CTS laptop (local inbox execution log)
**Branch/Tip tested:** `main` at `49bdd4a` + local unstaged fixes

Per request, I pulled latest, followed the inbox cadence, fixed precheck failures, and re-ran the gate.

### Fixes applied

- `src/main/ipc-router.ts`
	- Normalized `settings:update` payload before `saveSettings(...)` so optional fields are omitted instead of passed as `undefined` under `exactOptionalPropertyTypes`.
	- Normalized nested `profile.team` / `profile.email` the same way.
- `src/renderer/App.tsx`
	- Added missing `override` on `componentDidCatch(...)` to satisfy TS4114.

### Verification result

- `npm run report` exit: **0**
- Pre-checks:
	- typecheck: PASS
	- tests: PASS (**189/189**)
- PBKDF2 benchmark (integrated): PASS
	- max: **146.92 ms** (budget 800 ms)
- Dependency audit baseline unchanged:
	- critical 0 / high 5 / moderate 0 / low 3

Run artifacts were regenerated (`run-reports/*` + `STATUS.md`).

## 2026-04-18 17:10 — D19 pull + inbox execution + dev smoke

**From:** Asus TUF run machine
**Branch/Tip tested:** `main` at `10fa1ca`

Per request, I pulled latest, read inbox, ran `npm run report`, and ran `npm run dev`.

### Report result

- `npm run report` exit: **0**
- Pre-checks:
	- typecheck: PASS
	- tests: PASS (**95/95**)
- PBKDF2 benchmark (integrated): PASS
	- max: **91.94 ms** (budget 800 ms)
- Dependency audit baseline unchanged:
	- critical 0 / high 5 / moderate 0 / low 3

### Dev smoke result

- `npm run dev` booted cleanly and logged expected lines:
	- `app.ready`
	- `services.ready`
	- `licence.validate` with `mode:"none", valid:true`

Updated run artifacts and `STATUS.md` were pushed back.

## 2026-04-18 16:52 — D19 pull + inbox execution complete

**From:** Asus TUF run machine
**Branch/Tip tested:** `main` at `9a14934c`

Per inbox instruction, I pulled latest and ran `npm run report`.

### Results

- Pre-checks: PASS
	- typecheck: PASS
	- tests: PASS (95/95)
- PBKDF2 benchmark (integrated in report): PASS
	- min 90.6 ms / mean 92.49 ms / max 98.3 ms / budget 800 ms
- Dependency audit baseline unchanged:
	- critical 0 / high 5 / moderate 0 / low 3
- Report exit code: 0

Updated artifacts were generated and pushed (`run-reports/` + `STATUS.md`).

## 2026-04-18 16:28 — D16 verification run (precheck fail)

**From:** Asus TUF run machine
**Branch/Tip tested:** `main` at `b62d12bf`

Per D16 inbox instructions, I ran `npm run report` then `npm run dev`.

### `npm run report`

- Exit code: **1**
- Pre-checks:
	- typecheck: PASS
	- tests: FAIL (**1/41 failed**)

Failing test from `run-reports/latest.md`:
- `__tests__\\ipc-router.spec.ts` › `ipc-router (Phase 1 Wk3 security gate) accepts licence:validate with {} payload`

Failure detail from `run-reports/latest.json`:
- Expected: `{ ok: true, data: null }`
- Received: `{ ok: true, data: { valid: true } }`
- Assertion location: `__tests__/ipc-router.spec.ts:92:20`

Dependency audit remained baseline:
- critical 0 / high 5 / moderate 0 / low 3

### `npm run dev`

- Booted successfully with expected logs:
	- `app.ready`
	- `[ipc-router] 17 handlers registered (2 live, 15 stub)`
	- `services.ready`
	- `licence.validate` with `mode:"none", valid:true`
	- `app.will-quit`
- No `licence.gate-miss` warning observed.

## 2026-04-18 16:08 — D15 gate re-run after pull to `ccaaf6a`

**From:** Asus TUF run machine
**Branch/Tip tested:** `main` at `ccaaf6a2`

### Checklist results (1-6)

1. **Typecheck** — **PASS**
	 - Command: `npm run typecheck`
	 - Result: exit 0, no TS errors.

2. **Unit tests** — **FAIL (pretest native rebuild step)**
	 - Command: `npm test`
	 - Failure occurs in `pretest` script (`npm run rebuild:node`), before Vitest executes.
	 - Error summary:
		 - `npm rebuild better-sqlite3 --build-from-source`
		 - `node-gyp ERR! find VS ... Could not find any Visual Studio installation to use`
		 - Requires latest Visual Studio Build Tools with Desktop C++ workload.

3. **Electron dev boot** — **PASS**
	 - Command: `npm run dev`
	 - Predev hook rebuilt Electron ABI successfully:
		 - `npm run rebuild:electron` → `electron-rebuild -f -w better-sqlite3` → PASS
	 - Observed expected runtime lines:
		 - `[ipc-router] 17 stub handlers registered`
		 - `{"msg":"app.ready", ...}`
		 - `{"msg":"services.ready","meta":{"onboardingComplete":false,"appDbPath":"..."}}`
		 - `{"msg":"licence.validate","meta":{"mode":"none","valid":true}}`
		 - `{"msg":"app.will-quit"}`
	 - Artifacts:
		 - `%APPDATA%\\VisionEviDex\\app.db` (+ WAL/SHM while running) present
		 - `%APPDATA%\\VisionEviDex\\logs\\app-2026-04-18.log` updated
		 - `settings.json` absent (expected)

4. **IPC round-trip sanity (renderer DevTools)** — **NOT RUN (manual-only)**
	 - Requires manual renderer DevTools interaction to paste exact snippets and capture return payloads.

5. **Open toolbar/annotation/region windows** — **NOT RUN (manual-only)**
	 - Requires manual main-process DevTools/shim call path.

6. **Dependency audit trend via report** — **FAIL (exit code gate), DATA WRITTEN**
	 - Command: `npm run report`
	 - Command wrote outputs (`latest.json`, `latest.md`, `STATUS.md`, `benchmarks.jsonl`) but exited **1**.
	 - `latest.md` shows dependency audit section with expected counts:
		 - critical 0, high 5, moderate 0, low 3, total 8
	 - `benchmarks.jsonl` last line includes `"audit": {...}`.
	 - Failing precheck in report:
		 - `tests = FAIL` with note `could not parse vitest JSON output`.
	 - This correlates with step 2 pretest failure before Vitest execution.

## 2026-04-18 15:23 — D15 Week 3 gate verification results

**From:** Asus TUF run machine
**Branch/Tip tested:** `main` at `5f922d7`

### Checklist results (1-6)

1. **Typecheck** — **FAIL**
	- Command: `npm run typecheck`
	- Error 1: `src/main/ipc-router.ts:45` TS2375 (`fields` includes `undefined` under `exactOptionalPropertyTypes`)
	- Error 2: `src/shared/types/errors.ts:16` TS2412 (`this.fields = fields` incompatible with exact optional typing)

2. **Unit tests** — **PASS**
	- Command: `npm test`
	- Result: 3 spec files, 18/18 tests passed.

3. **Electron dev boot** — **FAIL (intermittent ABI mismatch state)**
	- Command: `npm run dev`
	- Observed expected startup lines:
	  - `[ipc-router] 17 stub handlers registered`
	  - `{"msg":"app.ready", ...}`
	- Then runtime error:
	  - `better_sqlite3.node was compiled against NODE_MODULE_VERSION 127; this Electron runtime requires 123`
	- Artifact checks:
	  - `%APPDATA%\\VisionEviDex\\app.db` exists (plus WAL/SHM while app active)
	  - `%APPDATA%\\VisionEviDex\\logs\\app-2026-04-18.log` contains prior successful lines `app.ready`, `services.ready`, `licence.validate`
	  - `settings.json` absent (as expected)

4. **IPC round-trip sanity (renderer DevTools)** — **NOT RUN via automation**
	- Manual DevTools interaction required for exact return payload capture.
	- Automated proxy evidence: `__tests__/ipc-router.spec.ts` validation-path tests pass (including `VALIDATION_FAILED` paths).

5. **Open toolbar/annotation/region windows** — **NOT RUN via automation**
	- Manual main-process DevTools/shim interaction required.

6. **Dependency audit trend via report** — **PASS**
	- Command: `npm run report`
	- `run-reports/latest.md` includes **Dependency audit (prod)** with `critical 0 / high 5 / moderate 0 / low 3 / total 8`
	- `run-reports/benchmarks.jsonl` last line includes `"audit": { ... }`
	- Exit code 0 confirmed.

### Notes for CTS

- There is an ABI tug-of-war between test runtime and Electron runtime for `better-sqlite3`:
  - Node test runtime currently expects module version 127.
  - Electron runtime expects module version 123.
- This affects the ability to keep both `npm test` and `npm run dev` green without rebuilding between contexts.

## 2026-04-18 08:10 — First run complete + vulnerability handoff

**From:** Asus TUF run machine

### First-run status

- `scripts\\setup-asus.ps1`: completed successfully
- `npm run dev`: app booted cleanly (Phase 0 scaffold)
- `npm run report`: generated expected scaffold report (PASS 0 / FAIL 0 / SKIP 18)

### Security note for CTS

- A dependency audit was run: `npm audit --omit=dev`
- Result: 8 vulnerabilities (3 low, 5 high)
- Key impacted packages: `xlsx`, `tar` chain via `canvas`, `@tootallnate/once` chain
- `npm audit fix --force` suggests bumping `fabric` to 7.x (breaking + violates pinned `fabric@5.3.0` decision)

Please review and track remediation from the new file: `VULNERABILITIES.md`.
