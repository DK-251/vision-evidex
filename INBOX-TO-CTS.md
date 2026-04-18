# INBOX — Asus TUF → CTS

Append-only messages from the Asus TUF run machine to the CTS laptop. Asus writes here when it needs the code machine to fix something, clarify a design, or address a test failure not visible in the run report.

**Protocol:**
- Append new entries at the TOP (reverse chronological).
- Date format: `YYYY-MM-DD HH:MM` (local Asus time).
- Mark entries resolved with `[RESOLVED YYYY-MM-DD]` prefix when CTS has addressed them. Never delete.
- Paste exact error output (stack traces, file:line, command run). The more concrete, the less back-and-forth.

---

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
