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
