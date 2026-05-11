# INBOX — CTS → Asus TUF

Append-only messages from the CTS laptop to the Asus TUF. CTS writes here when it needs the run machine to verify something specific, run a targeted test, or investigate a failure.

**Protocol:**
- Append new entries at the TOP (reverse chronological).
- Date format: `YYYY-MM-DD HH:MM` (local Asus time — consistent reference).
- Mark entries resolved with `[RESOLVED YYYY-MM-DD]` prefix. Never delete.

---

## 2026-05-11 — RUN REQUEST — Week 9 complete build

**From:** CTS via filesystem connector

Full W9 implementation landed. 3 new IPC handlers, 3 new pages, nav-store updated, sidebar wired, ~65 new tests.

### Files changed

**Main process:**
- `src/shared/ipc-channels.ts` — SESSION_LIST, CAPTURE_LIST, CAPTURE_GET_THUMBNAIL added
- `src/shared/schemas/index.ts` — SessionListSchema, CaptureListSchema, CaptureGetThumbnailSchema + inferred types
- `src/main/ipc-router.ts` — 3 new handlers registered
- `src/main/services/capture.service.ts` — getForSession(), getThumbnail() methods added
- `src/main/services/evidex-container.service.ts` — extractImage() method added
- `src/preload/preload.ts` — session.list(), capture.list(), capture.getThumbnail() exposed

**Renderer:**
- `src/renderer/stores/nav-store.ts` — project-overview, session-list, session-detail pages added
- `src/renderer/App.tsx` — 3 new page imports + ShellPageSwitch cases
- `src/renderer/components/shell/Sidebar.tsx` — Sessions item enabled + ImageMultipleFilled import
- `src/renderer/pages/ProjectOverviewPage.tsx` — NEW: sessions grouped by applicationUnderTest
- `src/renderer/pages/SessionListPage.tsx` — NEW: full history with search + filter
- `src/renderer/pages/SessionDetailPage.tsx` — NEW: historical session with lazy thumbnails + tag editing
- `src/renderer/pages/ProjectListPage.tsx` — handleOpen navigates to project-overview
- `src/renderer/pages/DashboardPage.tsx` — handleOpen navigates to project-overview
- `src/renderer/pages/CreateProjectPage.tsx` — post-create navigates to project-overview

**Tests:**
- `__tests__/w9-coverage.spec.ts` — NEW: ~65 tests across 10 sections

### One-shot Asus action

```
git pull --ff-only
npm run report
git add run-reports/latest.{json,md} run-reports/history/ STATUS.md INBOX-TO-ASUS.md
git commit -m "[INBOX] W9 gate"
git push
```

### Pass criteria

- typecheck PASS
- tests ≥ 515 PASS (453 existing + ~65 new)
- pbkdf2 PASS under 800ms
- modules SKIP 18 (unchanged)
- dep-audit 0 critical

### If typecheck fails

Most likely failure points:
1. `Sidebar.tsx` — `Page` type cast for `alsoActiveFor` array — check `ImageMultipleFilled` import
2. `capture.service.ts` — `getForSession` / `getThumbnail` return types vs `CaptureServiceDeps`
3. `evidex-container.service.ts` — `extractImage` signature vs usage in capture.service

Paste exact tsc output into INBOX-TO-CTS.md.

### After gate passes

1. Mark this entry [RESOLVED]
2. Run `npm run dev:keep` and manually verify:
   - Open an existing project → lands on ProjectOverviewPage with session cards grouped by app
   - Sessions sidebar item navigates to ProjectOverviewPage
   - Click a session → SessionDetailPage shows metadata + capture thumbnails
   - SessionListPage search and filter work
   - Tag a capture in SessionDetailPage — badge updates immediately
3. W10 / Phase 3 prep begins on next CTS session

---

## [RESOLVED 2026-05-11] 2026-05-11 — Step 4/5/9 results logged (Wk8 gate — long-pending) — 3 new issues sent to CTS

**From:** Asus TUF manual testing session  
**Gate:** Wk8 gate steps 4/5/9 — originally requested in INBOX-TO-ASUS 2026-05-06 00:30; deferred until pre-W9 UI fixes landed  
**Status:** Results logged in INBOX-TO-CTS. 3 new issues found; awaiting CTS fixes before W9 opens.

### What passed
- Project creation → project list navigation ✅ (fix #8 confirmed)
- `Ctrl+Shift+2` hotkey capture ✅
- Capture pipeline: thumbnail, tagging, detail panel (filename/hash/size), `.evidex` growth ✅
- No black overlay observed ✅

### New issues found (A/B/C in INBOX-TO-CTS)
- **A:** Opening a zero-session project auto-launches session form (should go to `ProjectOverviewPage`)
- **B:** Summary bar counts don't update after capture tagging
- **C:** Dev reset script prevents session persistence testing across relaunches

### Step 9 status
Blocked — `npm run dev` always clears state via `reset-dev-state.js`. Needs either a `dev:noclean` script or packaged build to verify.

### Next steps
Awaiting CTS to fix A + B (+ C dev script). Re-run steps 4/5/9 after fix. W9 opens after all confirmed.

---

## [RESOLVED 2026-05-11] 2026-05-11 — RUN REQUEST — Step 4/5/9 follow-up fixes (3 items)

**From:** CTS via filesystem connector  
**Based on:** Asus step 4/5/9 manual testing results (INBOX-TO-CTS 2026-05-11 top entry)

### What was fixed

**Issue A — Opening a project auto-launches session form:**  
`ProjectListPage.handleOpen` and `DashboardPage.handleOpen` now navigate to `project-list` after opening (same as post-creation). `ProjectOverviewPage` (W9 Day 1) will replace this.

**Issue B — Summary bar counts don't update after tagging:**  
`SessionGalleryPage counts` useMemo now always derives pass/fail/blocked from the live `captures` array instead of the stale `SESSION_STATUS_UPDATE` push. `captureCount` still uses the push for accuracy.

**Issue C — No way to test persistence without state reset:**  
`npm run dev:keep` already exists in `package.json` — it skips `reset-dev-state.js` and runs Electron directly. Use this for step 9 persistence testing.

### Files changed

- `src/renderer/pages/ProjectListPage.tsx` — `handleOpen` navigates to `project-list`
- `src/renderer/pages/DashboardPage.tsx` — `handleOpen` navigates to `project-list`  
- `src/renderer/pages/SessionGalleryPage.tsx` — `counts` useMemo always derives tag counts from `captures` array

### One-shot Asus action

```
git pull --ff-only
npm run report
git add run-reports/latest.{json,md} run-reports/history/ STATUS.md INBOX-TO-ASUS.md
git commit -m "[INBOX] step 4/5/9 follow-up fixes verification"
git push
```

### Pass criteria

- typecheck PASS
- tests 453/453 PASS
- pbkdf2 PASS under 800ms

### After gate passes

1. Re-run step 9 using `npm run dev:keep` (skips state reset) — verify `.evidex` persists across restarts
2. Verify summary bar updates when tagging a capture
3. Verify opening a project lands on project list, not session form
4. Mark ALL pending Wk8 INBOX-TO-ASUS entries **[RESOLVED]**
5. **W9 is open** — CTS begins Day 1 on next session

---

**From:** CTS via filesystem connector  
**Based on:** Asus manual testing session findings (INBOX-TO-CTS 2026-05-11)

All 6 bugs reported in the Asus manual testing session have been fixed. Changes touch renderer + main process. Typecheck must be verified before marking this resolved.

### Files changed

- `src/renderer/providers/ThemeProvider.tsx` — Exports `setPreference` via context; `settingsLoaded` state added; theme loaded reliably on every mount including post-onboarding re-mount
- `src/renderer/pages/AppSettingsPage.tsx` — `AppearanceTab` now calls `setPreference` live before saving to settings, so theme applies immediately without restart
- `src/renderer/styles/components.css` — Sidebar active pill in collapsed state: `left: 0` + `border-radius: 0 2px 2px 0` (was `left: 4px`, misaligned)
- `src/renderer/hooks/useWindowTier.ts` — Guards against 0-width on mount; uses `window.innerWidth` as authoritative source; sidebar auto-collapse now fires reliably on resize
- `src/renderer/pages/CreateProjectPage.tsx` — Post-creation navigates to `project-list` instead of `session-intake` (fixes auto-pop session form reported by Asus)
- `src/main/window-manager.ts` — `showToolbarWindow` suppressed (early return) until W9 toolbar UI is built; eliminates black overlay rectangle

### Bugs fixed vs Asus report

| Issue # | Description | Fixed |
|---|---|---|
| 1 | Theme not respecting system preference at launch | ✅ ThemeProvider re-reads on every mount |
| 2 | Theme selection not applying realtime during onboarding navigation | ✅ ThemeStorageStep already had restore logic; root was ThemeProvider not re-reading |
| 3 | Selected theme not applied in main app after onboarding | ✅ ThemeProvider re-mounts after complete() and re-reads settings.json |
| 4 | Sidebar indicator pill misaligned when collapsed | ✅ CSS left:0, border-radius corrected |
| 6 | Window resize not triggering sidebar collapse | ✅ useWindowTier uses window.innerWidth, guards 0-width |
| 8 | Session form auto-pops after project creation | ✅ CreateProjectPage navigates to project-list |
| 10 (overlay) | Black box persisting after app close | ✅ showToolbarWindow suppressed until W9 |

Issues 5, 7, 9, 11 are deferred: tooltips (W9 component), content scaling (W9 layout), session grouping by app (W9 ProjectOverviewPage), role-based dashboard (Phase 3).

### One-shot Asus action

```
git pull --ff-only
npm run report
git add run-reports/latest.{json,md} run-reports/history/ STATUS.md INBOX-TO-ASUS.md
git commit -m "[INBOX] pre-W9 manual UI bug fixes verification"
git push
```

### Pass criteria

- typecheck PASS
- tests 453/453 PASS (no test files changed)
- pbkdf2 PASS under 800ms
- modules SKIP 18 (unchanged)
- dep-audit 0 critical

### If typecheck fails

Most likely: `ThemeProvider.tsx` — `setPreference` added to context type. Check:
- `useThemeContext()` callers that destructure the context (only `AppSettingsPage` was updated)
- `settingsLoaded` unused variable warning (it\'s intentional for future use)

### After gate passes

1. Mark this entry [RESOLVED]
2. Re-run manual UI test steps 4/5/9 (create project → hotkey capture → gallery → close/reopen)
3. Confirm: theme respects system preference on launch, sidebar collapses on resize, no black overlay
4. Mark Wk8 INBOX-TO-ASUS entry [RESOLVED]
5. W9 opens on next CTS session

---

## [RESOLVED 2026-05-11] 2026-05-11 — INBOX RECEIVED — Manual UI testing findings documented (Pre-W9 testing phase)

**From:** Manual testing session  
**To:** Asus TUF (for gate verification after fixes)

**Status:** All 10 UI/functional issues logged in `INBOX-TO-CTS.md` for CTS to fix. Testing phase before W9 begins. Awaiting fixes + re-run request to verify.

### Summary

Comprehensive manual UI & functional testing completed across onboarding, main app, sidebar, content scaling, and project/session flows during pre-W9 testing phase. **10 critical issues found:**

1. Theme launch ignores system preference (dark mode not detected)
2. Theme selection doesn't apply realtime during onboarding nav
3. Selected theme not persisting to main app
4. Sidebar indicator pill misaligned on collapse
5. Tooltips need fluent design redesign + comprehensive wiring
6. Window resize doesn't collapse sidebar responsively
7. Content area padding increases but content doesn't scale
8. New session form auto-pops after project creation (should go to project page)
9. Sessions not organized by application card in project page
10. Session form auto-pop + key bindings broken + black overlay box persists

Plus overarching: **Main app needs remapping** (shortcuts, quick toolbar, role-based dashboards).

### Next steps

- CTS to fix issues #1-11 (tracked in INBOX-TO-CTS.md) before W9 begins
- Request re-run on Asus gate after fixes: `npm run report` + manual pre-W9 verification checklist
- Theme, responsive layout, and main-app features must be validated before W9 start

---

## [RESOLVED 2026-05-08] 2026-05-08 — RUN REQUEST — Test coverage expansion + Final pre-W9 analysis fixes

**From:** CTS via filesystem connector

Full final codebase analysis complete. New test spec added targeting all identified gaps.
All changes are renderer + shared types only (+ new test file). No new dependencies.

### New test file

- `__tests__/pre-w9-gap-coverage.spec.ts` — new spec covering:
  - Section 1: nav-store param clearing (10 tests)
  - Section 2: database-service clientName + boundary cases (15 tests)
  - Section 3: naming-service additional boundaries (12 tests)
  - Section 4: settings-service hotkeys + profile fields (8 tests)
  - Section 5: ipc-schemas additional boundaries (20 tests)
  - Section 6: session.store capture subscription lifecycle (4 tests)
  - Section 7: project.store isLoading + clear() (4 tests)
  - Section 8: capture-service edge cases + statusTag in result (8 tests)
  - Section 9: container-crypto additional edge cases (6 tests)
  - Section 10: hotkey-utils conflicts + formatKeyEvent (7 tests)
  - **Target: ~347 + ~94 new = ~440 total**

### Other files changed (on top of Batch A)

- `src/renderer/pages/SessionGalleryPage.tsx` — `derivedCounts()` uses `capture.statusTag`; notes textarea removed
- `src/renderer/components/ui/CaptureThumbnail.tsx` — `statusTag` prop removed; uses `capture.statusTag`
- `src/renderer/pages/DashboardPage.tsx` — View all navigates; showToast on error
- `src/renderer/pages/ProjectListPage.tsx` — showToast on open error
- `src/renderer/onboarding/ThemeStorageStep.tsx` — data-theme restore on unmount

### One-shot Asus action

```
git pull --ff-only
npm run report
git add run-reports/latest.{json,md} run-reports/history/ STATUS.md INBOX-TO-ASUS.md
git commit -m "[INBOX] Test coverage expansion + final pre-W9 verification"
git push
```

### Pass criteria

- typecheck PASS
- tests ≥ 420 PASS (347 existing + new spec; some tests may be skipped if crypto/sharp not rebuilt)
- pbkdf2 PASS under 800ms
- modules SKIP 18 (unchanged)
- dep-audit 0 critical

### If typecheck fails

- `CaptureThumbnail.tsx` — check `statusTag` prop removal: grep any caller passing it
- `pre-w9-gap-coverage.spec.ts` — check `_captureListener` type on session store

### After gate passes

Mark all 2026-05-08 entries [RESOLVED].
Proceed with manual UI test steps 4/5/9 (Wk8 gate entry 2026-05-06 00:30).
Week 9 begins after manual test confirmation.

---

## [RESOLVED 2026-05-08] 2026-05-08 — RUN REQUEST — Gap Analysis Batch A fixes (7 items)

**From:** CTS via filesystem connector

PRE-W9 gate confirmed green (`7975bb9`, 347/347). Batch A gap fixes now applied.
All changes are source-only — no new dependencies, no new test files.

### Files changed

- `src/shared/types/entities.ts` — `CaptureResult.statusTag` promoted from optional to required; `RecentProject.clientName` added
- `src/main/services/capture.service.ts` — `statusTag` now included in `screenshot()` return
- `src/main/services/database.service.ts` — `initAppSchema()` adds `client_name` column to `recent_projects` with try/catch `ALTER TABLE` for existing DBs; `getRecentProjects` and `upsertRecentProject` updated
- `src/main/services/project.service.ts` — `clientName` passed in both `create()` and `open()` upserts; `get()` injects `storagePath` from container handle
- `src/preload/preload.ts` — `project.create` typed as `ProjectCreateInput` (was `unknown`)
- `src/renderer/stores/session.store.ts` — `onCaptureArrived` subscription moved into `startSession`/`clearSession` lifecycle; module-level subscription removed
- `src/renderer/pages/SessionIntakePage.tsx` — modal withheld until settings resolve
- `src/renderer/providers/ToastProvider.tsx` — new file
- `src/renderer/App.tsx` — `ToastProvider` wired
- `src/renderer/stores/nav-store.ts` — `goBack()` TODO comment added
- `src/renderer/providers/ThemeProvider.tsx` — JSDoc updated
- `src/renderer/pages/DashboardPage.tsx` + `ProjectListPage.tsx` — type casts removed
- `src/main/ipc-router.ts` — hardcoded log string cleaned up

### One-shot Asus action

```
git pull --ff-only
npm run report
git add run-reports/latest.{json,md} run-reports/history/ STATUS.md INBOX-TO-ASUS.md
git commit -m "[INBOX] GAP-A Asus verification"
git push
```

### Pass criteria

- typecheck PASS
- tests 347/347 PASS (no test files changed)
- pbkdf2 PASS under 800ms
- modules SKIP 18 (unchanged)
- dep-audit 0 critical (baseline unchanged)

### If typecheck fails

The most likely failure point is `capture.service.ts` — the `statusTag` field on
`CaptureResult` changed from optional to required. If any test file or spec
constructs a `CaptureResult` without `statusTag`, tsc will error. Paste the exact
`tsc --noEmit` output into INBOX-TO-CTS.md and CTS will fix immediately.

### After gate passes

Mark this entry [RESOLVED] and proceed with manual UI test steps 4/5/9 from the
2026-05-06 00:30 Wk8 gate entry (still open). W9 implementation begins after
manual tests confirm the .evidex round trip is green.

**Standing rule (Asus):** on every `git pull` from CTS, read the topmost
unresolved entry here and execute its checklist before any other work.
On every `git push` from CTS, `git pull` first, then re-read this file.
Default cadence if no new entry: `npm run report` and push `run-reports/` + `STATUS.md`.

---

## [RESOLVED 2026-05-08] 2026-05-08 09:15 — RUN REQUEST — Phase 2 Week 8 HOTFIX (typecheck regression resolved)

**From:** CTS (Claude Code)
**Branch/Tip:** `main` at HEAD (after fixing typecheck regressions from git pull)

The latest pull (`7975bb9`) introduced 4 typecheck errors in renderer UI code. CTS patched all 4 regressions directly and re-ran `npm run report` locally. **Automated gate is now PASS.**

### Fixes applied (4 files)

1. **src/renderer/components/shell/Sidebar.tsx** — `NavItem` prop: changed `title={item.title}` to conditional spread `{...(item.title !== undefined && { title: item.title })}` to satisfy `exactOptionalPropertyTypes` rule. Also fixed `onClick` via conditional spread.

2. **src/shared/types/entities.ts** — `CaptureResult` interface: added optional `statusTag?: StatusTag` field (used by SessionGalleryPage detail panel for tag state).

3. **src/renderer/pages/DashboardPage.tsx** — Two changes:
   - Added `Page` type import from nav-store + threaded `navigate` callback to `EmptyProjectsState` and `RecentProjectsSection` components
   - Fixed `EmptyProjectsState` call site to pass `navigate` prop

4. **src/renderer/pages/SessionGalleryPage.tsx** — `useThumbnailUrl` hook: removed `instanceof Uint8Array` branch (thumbnail is always base64 string per CaptureResult type). Simplified to type-safe string-only check.

### Automated gate results (CTS local)

```
typecheck=PASS  tests=PASS  pbkdf2=178.51ms/800ms  modules: PASS 0  FAIL 0  WARN 0  SKIP 18
```

- typecheck: **PASS**
- tests: **347/347 PASS** (all pass; no new test failures)
- pbkdf2: **178.51 ms** (budget 800 ms — healthy 77% headroom)
- modules: **SKIP 18** (no changes to module gates)
- dep-audit: **0 critical / 5 high** (unchanged baseline)

### One-shot Asus action

```
git pull --ff-only
npm run report
git add run-reports/latest.{json,md} run-reports/history/ STATUS.md
git commit -m "[INBOX] PH2-W8 Asus verification — automated gate PASS"
git push
```

### Pass criteria — automated (already GREEN locally)

- typecheck **PASS** ✓
- tests **347/347 PASS** ✓
- pbkdf2 **PASS** (178.51 ms < 800 ms ceiling) ✓
- modules **SKIP 18** (no regression) ✓

### Manual UI test sequence (run after Asus pulls and gate re-confirms PASS)

These are the steps from the Wk8 brief (Steps 1–9 from 2026-05-06 request). Run them in order on Asus; pause if any [ ] check fails and paste exact error block back to INBOX-TO-CTS.

**STEP 1 — App launches to Projects, not Dashboard (AQ5):**
- [ ] First nav item is "Projects" (FolderRegular icon) in the sidebar
- [ ] App opens on `ProjectListPage` with empty state on fresh install
- [ ] "Create project" btn-accent visible top-right

**STEP 2 — Create a real project:**
1. Click "Create project" → CreateProjectPage opens
2. Fill in: Project name: `Week 8 Gate Project` | Client name: `Asus TUF Verify` | Start date: today | Template: default | Branding: default | Storage: Documents\VisionEviDex
3. Click "Create project"
- [ ] Form submits without error
- [ ] App navigates to `session-intake` modal
- [ ] `*.evidex` file appears in storage folder

**STEP 3 — Create a session:**
Complete intake: Test ID: `TC-GATE-001` | Test name: `Week 8 Gate Test` | Scenario: `Verify real capture writes to .evidex on disk` | Environment: `QA` | App under test: `Vision-EviDex v0.8`
- [ ] Modal closes → `SessionGalleryPage` renders
- [ ] Floating capture toolbar appears
- [ ] Toolbar counter shows 0

**STEP 4 — Take real screenshots:**
Press `Ctrl+Shift+1` three times (fullscreen capture hotkey)
- [ ] Capture flash (~80ms white overlay) on each press
- [ ] Toolbar counter increments: 0 → 1 → 2 → 3
- [ ] Real `CaptureThumbnail` tiles appear (transitions from GallerySkeleton)
- [ ] Thumbnails show "untagged" badge
- [ ] No console errors in DevTools

**STEP 5 — Verify .evidex integrity:**
DevTools console: `window.evidexAPI.session.get('<sessionId from toolbar pill>').then(r => console.log(JSON.stringify(r.data, null, 2)));`
- [ ] Response includes `captureCount: 3`
- [ ] File size > 200 KB (3 JPEGs + project DB)

**STEP 6 — Tag a capture:**
Click a thumbnail → detail panel → click "Pass"
- [ ] Thumbnail badge updates to green "pass"

**STEP 7 — End the session:**
Click "End session" → confirm
- [ ] Toolbar hides
- [ ] Nav returns to `ProjectListPage`
- [ ] `Ctrl+Shift+1` no longer fires

**STEP 8 — Recent projects:**
- [ ] `ProjectListPage` shows "Week 8 Gate Project" in recent list
- [ ] Dashboard shows same row

**STEP 9 — Reopen (the round-trip!):**
Click project in recent list
- [ ] Project opens without error
- [ ] DevTools: `window.evidexAPI.session.get('<sessionId>')` returns `captureCount: 3` — proves per-container DB survived close + reopen

### Resolution

If automated gate is PASS on Asus and Steps 4 + 5 + 9 pass in manual sequence:
- Tick `EC-04`, `EC-05`, `EC-07`, `EC-08`, `EC-09`, `EC-10`, `EC-15`, `EC-16`, `EC-17` in [FEATURES.md](FEATURES.md)
- Mark this entry `[RESOLVED 2026-05-08]`

If gate or manual step fails: paste exact error block into INBOX-TO-CTS.md and CTS will patch on next pull.

---

## [RESOLVED 2026-05-08] 2026-05-07 — RUN REQUEST — Pre-Week-9 renderer fixes (41 items)

**From:** CTS
**Branch/Tip:** main at HEAD

Pre-W9 cleanup is complete. 41 renderer fixes applied directly to 
source. No main-process or test file changes — all edits are in 
src/renderer/ and src/renderer/styles/ only. The gate should still 
pass at 347/347 since no service, IPC, or test code was touched.

### One-shot Asus action

git pull --ff-only
npm run report
git add run-reports/latest.{json,md} run-reports/history/ STATUS.md INBOX-TO-ASUS.md
git commit -m "[INBOX] PRE-W9 Asus verification"
git push

### Pass criteria

- typecheck PASS
- tests 347/347 PASS (no test files changed, count unchanged)
- pbkdf2 PASS under 800ms
- modules SKIP 18 (unchanged)
- dep-audit 0 critical baseline unchanged

### If anything fails

Paste the exact tsc output or vitest failure block into 
INBOX-TO-CTS.md with the commit SHA tested. CTS will fix on next pull.

### After gate passes

Mark this entry [RESOLVED] and proceed with manual UI test steps 
4/5/9 from the 2026-05-06 00:30 Wk8 gate entry (still open).

---

## [RESOLVED 2026-05-11] 2026-05-06 00:30 — RUN REQUEST — Phase 2 Week 8 (PROJECT LIFECYCLE + per-container DB)

**From:** CTS (Claude Code)
**Branch/Tip:** `main` at HEAD (latest commit on push)

This is the Wk 8 gate. Eight commits sit on top of the green PH2-W7 hotfix (`88185b0`) — together they wire the .evidex project lifecycle, eliminate the `NO_CONTAINER` sentinel, and unblock the first non-zero P0 feature ticks. **Asus is the first machine to exercise real `desktopCapturer` → encrypted `.evidex` round trip.**

### Commits in this gate (in order)

| SHA | Title |
|---|---|
| `672eda0` | `[PH2-W8-AUDIT]` Rule 4 + Rule 6 audits — both PASS |
| `b19dd61` | `[PH2-W8-1]` ProjectService + per-container project DB lifecycle |
| `2a5ffc6` | `[PH2-W8-2]` project.store.ts + project IPC channels + preload |
| `4c48bf2` | `[PH2-W8-4]` eliminate NO_CONTAINER sentinel — real handles |
| `1a50df0` | `[PH2-W8-3]` ProjectListPage + CreateProjectPage + nav routing |
| `0a701b9` | `[PH2-W8-5]` CAPTURE_ARRIVED push event — gallery live population |
| `5910fd5` | `[PH2-W8-6]` Dashboard via project store + first 3 PM ticks |
| `52b54d1` | `[PH2-W8-10]` full project round-trip integration spec |
| (this) | `[PH2-W8-7]` CLAUDE.md + CHANGELOG + INBOX gate request |

### One-shot Asus action

```
git pull --ff-only
npm run report
git add run-reports/latest.{json,md} run-reports/history/ STATUS.md
git commit -m "[INBOX] PH2-W8 Asus verification — automated gate"
git push
```

### Pass criteria — automated

- typecheck **PASS**
- tests **~346 / 346 PASS** (was 327/23 at the prior gate; Wk 8 added ~19 tests across 2 new files + edited specs to match the getDb getter pattern)
- pbkdf2 **PASS** under 800 ms ceiling. **Watch the trend:** `EvidexContainerService` now opens a real per-container DB on `create()` and on every Wk 8 IPC test. If mean climbs past 400 ms, flag it — the budget still holds, but PBKDF2 is on the open hot path now and the headroom matters before Phase 4 release-hardening.
- modules: `project` should still SKIP (no module gate runner for it yet); `capture` *may* flip away from SKIP if the manual UI test in Step 4 succeeds — but the automated module table is unchanged in this commit.
- dep-audit: 0 critical / 5 high baseline unchanged.

### Manual UI test sequence (run after the automated gate is green)

These are the steps the brief listed under W8-11 INBOX. Run them in order; pause if any **[ ]** check fails and paste the exact error block back into INBOX-TO-CTS.

**STEP 1 — App launches to Projects, not Dashboard (AQ5):**
- [ ] First nav item is "Projects" (FolderRegular icon) in the sidebar
- [ ] App opens on `ProjectListPage` with the empty state ("No projects yet") on a fresh install
- [ ] Create project btn-accent visible top-right

**STEP 2 — Create a real project:**
1. Click "Create project" → CreateProjectPage opens
2. Fill in:
   - Project name: `Week 8 Gate Project`
   - Client name: `Asus TUF Verify`
   - Start date: today
   - Template: leave at default (`tpl-default-tsr`)
   - Branding: leave at default (`brand-default`)
   - Naming pattern: leave default — verify the live preview underneath shows a sample like `WEEK8GAT_T-001_2026-05-06_…_0001.jpg`
   - Storage folder: click Browse → pick `Documents\VisionEviDex` (create it if needed)
3. Click "Create project"
- [ ] Form submits without error
- [ ] App navigates to `session-intake` (the modal opens)
- [ ] A `*.evidex` file appears in the chosen storage path. Verify in Explorer: `dir Documents\VisionEviDex` should list one file.

**STEP 3 — Create a session on the real project:**
1. Complete the session intake form:
   - Test ID: `TC-GATE-001`
   - Test name: `Week 8 Gate Test`
   - Scenario: `Verify real capture writes to .evidex on disk`
   - Environment: `QA`
   - App under test: `Vision-EviDex v0.8`
2. Submit
- [ ] Modal closes
- [ ] `SessionGalleryPage` renders (GallerySkeleton 8 shimmer tiles)
- [ ] Floating capture toolbar appears
- [ ] Toolbar counter shows 0

**STEP 4 — Take real screenshots (the actual gate):**
1. Press `Ctrl+Shift+1` (default fullscreen capture hotkey)
- [ ] Capture flash (~80ms white overlay)
- [ ] Toolbar counter increments to 1
- [ ] GallerySkeleton transitions to a real `CaptureThumbnail` (160×90 thumbnail of the captured screen)
- [ ] Thumbnail badge shows "untagged"
- [ ] No console errors in DevTools

Press the hotkey twice more — counter should reach 3, all thumbnails visible.

**STEP 5 — Verify .evidex integrity:**
DevTools console:
```js
window.evidexAPI.session.get('<sessionId from toolbar pill>')
  .then(r => console.log(JSON.stringify(r.data, null, 2)));
```
- [ ] `captureCount: 3`
- [ ] `passCount: 0, failCount: 0, blockedCount: 0`

Check the `.evidex` file size has grown (Explorer):
- [ ] File size > 200 KB (3 JPEG-85 images + the project DB)

**STEP 6 — Tag a capture:**
Click a thumbnail → detail panel opens → click Pass.
- [ ] Thumbnail badge updates to green "pass"
- [ ] Detail panel reflects "pass"

**STEP 7 — End the session:**
Click End session in the gallery header → confirm.
- [ ] Toolbar hides
- [ ] Navigation returns to `ProjectListPage` (or Dashboard)
- [ ] `Ctrl+Shift+1` no longer fires (verify by pressing — nothing should happen)

**STEP 8 — Recent projects:**
- [ ] `ProjectListPage` shows "Week 8 Gate Project" in the recent list
- [ ] Dashboard shows the same row

**STEP 9 — Reopen on the same machine (the round-trip!):**
Click the project in the recent list.
- [ ] Project opens with no error
- [ ] DevTools: `window.evidexAPI.session.get('<sessionId from earlier>')` returns the session **with `captureCount: 3` still present** — proves the per-container project DB survived close + reopen

### Resolution

If **all** automated checks pass AND Steps 4 + 5 + 9 in the manual sequence pass:
- Tick `EC-04`, `EC-05`, `EC-07`, `EC-08`, `EC-09`, `EC-10`, `EC-15`, `EC-16`, `EC-17` in [FEATURES.md](FEATURES.md) at the run-report commit
- Mark this entry as `[RESOLVED 2026-05-06]`
- Push the run artifacts + the FEATURES tick patch as one commit

If anything fails: paste the exact error block (typecheck output, vitest assertion, DevTools console) into `INBOX-TO-CTS.md` and I'll patch on next pull.

---

## [RESOLVED 2026-05-05] 2026-05-05 21:30 — PH2-W7 hotfix — typecheck (9) + tests (2) regressions resolved

**From:** CTS (Claude Code)

Read your `2026-05-05 12:58` INBOX-TO-CTS entry. All 9 typecheck errors and both failing tests are fixed in this push. Re-running `npm run report` should now restore the consolidated gate to PASS.

### What was fixed (file → root cause → fix)

1. `src/main/ipc-router.ts:128` — Zod `.optional()` → `T | undefined`, but `SessionIntakeInput` uses `?:` (exactOptional). Destructure the 5 optional fields and conditionally re-add them when defined.
2. `src/main/ipc-router.ts:173` — same root cause for `region` on `CaptureRequestInput`. Destructure → conditionally spread.
3. `src/main/services/session.service.ts:224` — `logger.info('session.end', summary)` requires `Record<string, unknown>`. Cast: `summary as unknown as Record<string, unknown>`.
4-8. `src/renderer/components/modals/SessionIntakeModal.tsx` — `FieldProps.error?: string` rejected `string | undefined` callers under exactOptional. Widened to `error?: string | undefined`.
9. `src/renderer/components/ui/CaptureThumbnail.tsx:47` — TS5.5 `Uint8Array<ArrayBufferLike>` not assignable to `BlobPart` (SharedArrayBuffer concern). Cast to `unknown as BlobPart` — runtime is fine; this branch is only reached if a future capture path returns Buffer (today it returns base64 string).

### Test fixes

- `__tests__/integration.session-lifecycle.spec.ts:254` — "end() skips container.save when no container is open": Two `mockReturnValueOnce` calls were FIFO-queued. The first one returned the handle (default already returned the handle, so it was redundant), and the queued `null` was never reached because `create()` doesn't call `getCurrentHandle()`. **Fix:** drop the redundant first override and switch the second to `mockReturnValue(null)` so it sticks for `end()`'s single `getCurrentHandle()` call.
- `__tests__/ipc-router.spec.ts:117` — "accepts a valid session:create payload and returns stub null": After D35 wired session into the registry, the test's `mockServices` was missing `session`/`capture`/`container` stubs, so the call hit `undefined.create`. **Fix:** add minimal stubs (`session.create` returns `null` to keep the existing assertion accurate).

### One-shot Asus action

```
git pull --ff-only
npm run report
git add run-reports/latest.{json,md} run-reports/history/ STATUS.md
git commit -m "[INBOX] PH2-W7 hotfix Asus verification — automated gate"
git push
```

### Pass criteria (same as the 19:00 entry below)

- typecheck PASS
- tests **327/327 PASS** (was 325/327 — 2 fixed, none added/removed)
- pbkdf2 PASS (under 800 ms ceiling — Asus reference is mean ≈ 91 ms; today's 145.5 ms still fine)
- modules SKIP 18 (unchanged — gates haven't moved)

If green, mark this entry plus the four entries below (`19:00 CONSOLIDATED`, `PH2-TEST`, `PH2-W7`, `PH2-1.5`) `[RESOLVED <date>]` in one batch and push run artifacts. If anything still fails, paste the exact error block back into INBOX-TO-CTS and I'll fix on next pull.

---

## [RESOLVED 2026-05-05] 2026-05-05 19:00 — CONSOLIDATED RUN GATE — single Asus action covers PH2-1.5 + PH2-W7 + PH2-TEST

**From:** CTS (Claude Code)

CTS just pushed everything from this Phase 2 Week 7 sprint as a single commit on `main`. The three earlier gate entries below (PH2-1.5 mock fix, PH2-W7 capture-pipeline plumbing, PH2-TEST expanded suite) describe distinct *layers* but they all sit on the same HEAD now — **one `npm run report` answers all three**.

### One-shot Asus action

```
git pull --ff-only
npm run report
git add run-reports/latest.{json,md} run-reports/history/ STATUS.md
git commit -m "[INBOX] PH2-W7 + PH2-TEST Asus verification — automated gate"
git push
```

### Pass/fail criteria (all must hold)

| Check | Expected | Notes |
|---|---|---|
| `prechecks.typecheck` | PASS | `tsc --noEmit` clean |
| `prechecks.tests` | PASS, **323 tests** | Was 223 at the last gate (`32ac2719`). +100 across 23 files. |
| Modules | All 18 still SKIP | Real assertions land at Wk 8 with Project-open. |
| `pbkdf2` benchmark | mean ≤ 200 ms | Budget 800 ms; baseline 94.47 ms at `32ac2719`. **Watch for cold-start regression** — `EvidexContainerService` is now constructed at app start (was previously not instantiated). |
| `dependencyAudit` | 0 critical | 5 high acceptable per `VULNERABILITIES.md` baseline. |

### Manual UI checks (not in automated report — only do if you have 10 minutes)

These are nice-to-haves; PASS on the report above is the actual sprint gate. The full plumbing-mode behaviour is documented in the PH2-W7 entry below — short version:

1. **Hotkey path is wired but won't write to disk.** Press `Ctrl+Shift+1` while a session is active. Logger should show `hotkey.capture failed` because `containerId === 'NO_CONTAINER'`. **Expected** in D35 plumbing mode.
2. **Session create → toolbar shows.** From the dashboard, devtools-trigger `useNavStore.getState().navigate('session-intake', { projectId: 'proj_test' })`, fill the form, submit. Toolbar should appear with counter showing `0`, not blank.
3. **Session end → Rule 8.** Click "End session" in the gallery. Logger should show `session.end.noActiveContainer — Rule 8 save skipped` (because no real container is open) — Container `.save()` is *attempted* but skipped, with a warning. Expected pre-Wk8.

### What ships in this commit (one-paragraph summary)

- **D32-D33 plumbing:** `ShortcutService` (9 tests) + `SessionService` (11 tests) + `SHORTCUT_CONFLICT` error code. Architectural Rule 8 closed (`container.save()` on session end). Rule 12 enforced (single active session per project).
- **D34 renderer:** `SessionIntakeModal` (560 px S-04 form, submit-only validation), `SessionIntakePage`, `SessionGalleryPage`, `GallerySkeleton`, `CaptureThumbnail`. `nav-store` extended with `session-intake` / `session-gallery` pages + history stack. `session.store` Zustand store with optimistic tag updates.
- **D35 wiring:** `CAPTURE_SCREENSHOT` IPC handler with session active-guard + `SESSION_STATUS_UPDATE` / `CAPTURE_FLASH` / `STORAGE_WARNING` broadcasts. `CAPTURE_TAG_UPDATE` handler live. `electronCaptureSource` adapter (`desktopCapturer`-backed, region crop via sharp). Real `onCapture` hotkey path in `app.ts`. `SESSION_GET` IPC channel added end-to-end. **16 live / 12 stub** handlers.
- **PH2-TEST:** 4 new spec files + 7 audit additions to existing specs. **+100 tests, +4 files (223/19 → 323/23).**

### Three known stubs left for Wk 8

These are documented in CLAUDE.md §1 and won't move until Project-open lands:

- `'NO_CONTAINER'` sentinel everywhere `EvidexContainerService.getCurrentHandle()` returns `null`
- `SessionLookup` adapter `projectName` / `clientName` hardcoded `'Pre-Wk8 …'`
- `SessionIntakePage` `projectName` literal `'Active Project'`

### When done

Push `latest.json` + `latest.md` + `run-reports/history/`. Append a one-line note to `INBOX-TO-CTS.md` referencing this entry. Mark this entry **AND** the three below it (`PH2-TEST`, `PH2-W7`, `PH2-1.5`) `[RESOLVED YYYY-MM-DD]` in the same edit — they're all redeemed by this single run.

---

## [RESOLVED 2026-05-05] 2026-05-05 18:30 — PH2-TEST: Expanded test suite run gate

**From:** CTS (Claude Code)

Post-D35 expansion of the automated test coverage. Scope A from the brief: 4 new spec files plus a coverage audit that filled 7 specific gaps in the existing specs. No new packages, no `vitest.config.ts` env changes — all renderer-store specs run in node by shimming `window` manually (until the deferred PH2-REACT-TESTS PR lands jsdom + testing-library).

### Test count delta

| | Files | `it()` blocks |
|---|---|---|
| Before this commit (at `32ac2719`) | 19 | 223 |
| After PH2-W7 (Tasks 1–6 prior commits) | 21 | 243 |
| **After PH2-TEST (this commit)** | **23** | **323** |

CTS-side grep produces 323. Asus must confirm `tests` precheck reports a matching count.

### What's new

**Audit additions (7 tests across 4 existing files):**
- `naming-service.spec.ts` → 22 (was 21): +1 — TesterInitials from a 4-word name
- `manifest-service.spec.ts` → 10 (was 9): +1 — empty-manifest integrityCheck (also strengthened mismatch test to assert `expectedHash`)
- `licence-service.spec.ts` → 15 (was 12): +3 — `fs.existsSync` not called, `fetch` not called, validate ignores pre-existing `licence.sig`
- `evidex-container-service.spec.ts` → 14 (was 12): +2 — `getSizeBytes()` positive, atomic-rename resilience (writeFile rejection preserves original byte-for-byte)

**New files (93 tests across 4 files):**
- `__tests__/ipc-schemas.spec.ts` (44) — pure Zod parse coverage for every IPC payload schema. Sister to `ipc-router.spec.ts` (which tests the dispatch wrapper).
- `__tests__/nav-store.spec.ts` (15) — extended store from D34 (session-intake / session-gallery / history cap / goBack).
- `__tests__/session.store.spec.ts` (15) — Zustand store with optimistic tag updates, mocked `window.evidexAPI` (nested `session.create` / `capture.updateTag` shape — matches the actual preload bridge).
- `__tests__/integration.session-lifecycle.spec.ts` (19) — end-to-end exercise of `SessionService` + `ShortcutService` + `DatabaseService(':memory:')`. Asserts Rule 8 (`container.save` on end), `SESSION_ALREADY_ACTIVE` guard, append-only `access_log` rows, hotkey register/unregister, rollback on shortcut-register failure.

### Checklist for Asus

1. `git pull --ff-only`. Confirm HEAD matches whatever CTS pushed for this commit.
2. `npm run report` — expectations:
   - `prechecks.typecheck` PASS.
   - `prechecks.tests` PASS — count must be **323** (or higher if Asus added anything in parallel; lower means a regression).
   - All 18 modules can still report SKIP — Project-open is still Wk 8 work.
3. **Critical for the integration spec:** `integration.session-lifecycle.spec.ts` instantiates `new DatabaseService(':memory:')` and calls `initProjectSchema()` to apply the migration. If the better-sqlite3 native binding mismatches the active Node ABI (rebuild rhythm in CLAUDE.md §8), this spec will fail at construction time. The auto `pretest` → `rebuild:node` script should handle this — verify `npm test` ran cleanly.

### What this run does NOT cover

React component specs (`SessionIntakeModal` / `CaptureThumbnail` / `GallerySkeleton`) are deferred to `[PH2-REACT-TESTS]` in BACKLOG. Adding them needs four `npm install` lines + a `vitest.config.ts` env split + `__tests__/setup.ts`. None of those changes are in this commit.

### When done

Push `latest.json` + `latest.md` + `run-reports/history/`. Append a one-line note to `INBOX-TO-CTS.md`. Mark this entry `[RESOLVED YYYY-MM-DD]`.

---

## [RESOLVED 2026-05-05] 2026-05-05 17:00 — PH2-W7: Run gate for D32–D35 (Phase 2 Week 7 complete)

**From:** CTS (Claude Code)

End-of-sprint gate for Phase 2 Wk 7 D32–D35. The PH2-1.5 mock-fix gate is superseded by this one — that commit is part of the chain landing here, so the new run-report covers it implicitly. (You can still mark PH2-1.5 below `[RESOLVED 2026-05-05]` once you've pushed `latest.json` for this gate.)

### What landed since `32ac2719` (last gated commit)

- `ShortcutService` + 9 tests — `SHORTCUT_CONFLICT` error code, partial-registration rollback, `app.will-quit` dual-unregister.
- `SessionService` + 11 tests — Architectural Rule 8 closed (`container.save()` on every session end). `SESSION_ALREADY_ACTIVE` / `SESSION_NOT_FOUND` / `SESSION_NOT_ACTIVE` guards.
- `SESSION_GET` IPC channel (channel + schema + router + preload).
- `CAPTURE_SCREENSHOT` and `CAPTURE_TAG_UPDATE` IPC handlers wired (was stubs). 16 live / 12 stub.
- `electronCaptureSource` — `desktopCapturer`-backed `CaptureSource`. Region-mode crops via sharp before the buffer reaches `CaptureService` so Rule 7 still holds.
- D35 `SessionLookup` adapter in `app.ts` — `projectName`/`clientName` stubbed `'Pre-Wk8 …'`; `containerId` resolves to `'NO_CONTAINER'` when nothing is open. **This is the critical D35 plumbing-mode boundary** (per AQ5).
- Renderer: `session.store.ts`, `SessionIntakeModal` (560 px, S-04 form), `SessionIntakePage`, `SessionGalleryPage`, `GallerySkeleton`, `CaptureThumbnail`. `nav-store` extended for session pages.

### Checklist for Asus

1. `git pull --ff-only`. Confirm HEAD matches whatever CTS pushed for this commit.
2. `npm run report` — expectations:
   - `prechecks.typecheck` PASS.
   - `prechecks.tests` PASS — count is **203 + 9 (ShortcutService) + 11 (SessionService) = 223** if no other tests changed. Anything in that ballpark is green; the exact count surfaces in `latest.md`.
   - All 18 modules can still report SKIP — no module reaches PASS until Project-open lands in Wk 8 (container handles are still the `'NO_CONTAINER'` sentinel).
   - `pbkdf2` PASS, mean ≤ 200 ms (R-07 budget 800 ms). **Watch for regression**: `EvidexContainerService` is now constructed at app start (was previously not instantiated), so cold-start could be sensitive. Compare the `sprint0-benchmark.json` row against the 2026-04-23 baseline (mean 94.47 ms).
   - `dependencyAudit` 0 critical (5 high acceptable per VULNERABILITIES.md baseline).

### Manual checks (UI flow — not in automated report)

3. **Session create end-to-end.** Navigate to session-intake (need to wire a "New session" button on the Dashboard or use devtools to trigger `useNavStore.getState().navigate('session-intake', { projectId: 'proj_test' })`), fill the form, submit. Verify a session row appears in `app.db` `sessions` table.
4. **Hotkey path doesn't crash.** With a session active, press `Ctrl+Shift+1`. App should NOT crash. Logger should show:
   - `shortcut.callback` (or similar) firing.
   - `hotkey.capture failed` warn from `app.ts` because `containerId === 'NO_CONTAINER'`. **This is EXPECTED and correct for D35 plumbing mode.**
5. **End session.** Click "End session" in the gallery header. Verify:
   - a. Hotkeys are released — pressing `Ctrl+Shift+1` after end does nothing.
   - b. `session.endedAt` is set in the DB.
   - c. Logger shows `session.end.noActiveContainer — Rule 8 save skipped` (because no container is open). Container `.save()` is **attempted** but skipped, with a warning. That's the expected pre-Wk8 behaviour.
6. **`SESSION_STATUS_UPDATE` push.** The toolbar counter should display "0" immediately after session create — not blank, not flicker. Visual check.

### Why this matters

This commit closes the Phase 2 Wk 7 plumbing scope. Wk 8 (Project-open) replaces every `'NO_CONTAINER'` sentinel and `'Pre-Wk8 …'` stub with real values, after which the `capture` module can actually move from SKIP to PASS. The current gate just confirms the wiring is sound enough that nothing crashes when the container is absent.

### When done

Push `latest.json` + `latest.md` + `run-reports/history/`. Append a one-line note on this gate to `INBOX-TO-CTS.md`. Mark this entry `[RESOLVED YYYY-MM-DD]`. The PH2-1.5 entry below can be marked resolved at the same time.

---

## [RESOLVED 2026-05-05] 2026-05-05 09:30 — PH2-1.5: Run gate for CaptureService test-mock fix (HEAD `85a61bd`)

**From:** CTS (Claude Code)

The PH2-1 CaptureService scaffold was gated on `32ac2719` (last `latest.json`, 2026-04-23). One follow-up commit (`85a61bd`, "Fix CaptureService test mocks — use PNG buffer instead of raw RGBA") sits at HEAD without an Asus run report. CTS-side `vitest` reports 203/203 PASS but CTS can't run native modules — Asus is the source of truth. This is a non-blocking gate: D32–D35 work continues on CTS while Asus runs the report.

### What changed since last gate

Test fixture only — `CaptureService.spec.ts` mocks now feed a real PNG buffer to `sharp(...)` via `await sharp({create:{...}}).png().toBuffer()` instead of a synthetic RGBA `Buffer.alloc(...)`. Previously the raw-RGBA mock passed by accident on CTS but blew up under sharp's image-format detection on the `electron-rebuild`'d native binary. No production-path code was touched.

### Checklist for Asus

1. `git pull --ff-only` — confirm HEAD is `85a61bd`.
2. `npm run report` — expectations:
   - `prechecks.typecheck` PASS.
   - `prechecks.tests` PASS, **203/203** (no test count change vs `32ac2719`; only mock fixtures touched).
   - All 18 modules still SKIP (no module assertions yet — that lands D33–D35).
   - `pbkdf2` PASS, mean ≤ 200 ms (R-07 budget 800 ms).
   - `dependencyAudit`: 0 critical (5 high acceptable per VULNERABILITIES.md baseline).
3. Push `run-reports/latest.{json,md}`, `run-reports/history/`, `STATUS.md`.
4. Mark this entry `[RESOLVED YYYY-MM-DD]` after push.

### Why this matters

Closes the gap between snapshot 2026-05-05 and the last green Asus gate. Before the next CTS commit moves the `capture` module assertions toward PASS (D33–D35: SessionService + ShortcutService + capture↔session wiring), HEAD must be confirmed-green on Asus so any failure during D33–D35 has a clean baseline to bisect against.

---

## [RESOLVED 2026-04-23] PH2-1: CaptureService scaffold + 9-step pipeline invariant tests (Phase 2 Wk 7 / D32 prep)

**From:** CTS (Claude Code)

Phase 1 is closed on Asus as of FUI-7 / `197d0dd`. Opening Phase 2 (Wk 7 — CaptureService + global hotkeys + region overlay). This commit lands the CaptureService in isolation, with real dependencies wired through constructor injection so tests can drive the full pipeline without an Electron runtime.

### What landed

- `src/main/services/capture.service.ts` — `CaptureService` class, 9-step pipeline per Tech Spec §9.2. Step 3 (SHA-256) runs on the untouched `rawBuffer` BEFORE any `sharp().jpeg()` call (Architectural Rule 7). Step 7 writes into `EvidexContainerService`, Step 8 inserts the `Capture` row and appends a matching `ManifestEntry`, Step 9 fires the optional `onFlash` callback.
- Abstractions so tests (and later IPC wiring) can stay clean:
  - `CaptureSource` — wraps `desktopCapturer` in the real runtime, a fake Buffer in tests.
  - `SessionLookup` — `SessionService` (D39) will implement this; tests pass a stub.
  - `RuntimeInfo` — machine / OS / app version injected, not hard-coded.
- `__tests__/capture-service.spec.ts` — 10 tests covering:
  - Hash-before-compression invariant (`result.sha256Hash === sha256(rawBuffer)`; would break if sharp ran first)
  - Compression actually happens (fileSizeBytes < raw)
  - Thumbnail is a valid base64 JPEG (magic bytes FF D8 FF)
  - Capture row hash matches manifest entry hash matches result hash
  - Persist-then-manifest ordering (addImage → insertCapture → appendManifest)
  - `onFlash` fires after persistence (step 9 last)
  - Default + explicit `statusTag` handling
  - `region` passthrough to the capture source
  - Deterministic filename from NamingContext
- `CLAUDE.md §1` updated — sprint focus moves to Phase 2 Week 7.

### What's explicitly NOT in this commit

- IPC wiring. `capture:screenshot` is still the stub in `ipc-router.ts` — CaptureService isn't yet instantiated in `app.ts`. Comes in the next commit (PH2-2) once we have a `SessionService` skeleton to fulfil the `SessionLookup` contract.
- `desktopCapturer` real source. The `ElectronCaptureSource` adapter is D31/D32 Asus-side work that needs the real runtime to verify.
- ShortcutService + region window — D33/D34.

### Checklist for Asus

1. `git pull --ff-only`
2. `npm run report` — expect PASS with **+10 tests** (should land at 199/199).
   - `CaptureService` specs must all pass; if any assertion about step ordering fails, the pipeline was refactored in a way that breaks Architectural Rule 7 — flag immediately, do not patch.
3. `npm run dev`:
   - `[ipc-router] 27 handlers registered (12 live, 15 stub)` — unchanged from FUI-7 (no IPC churn this commit).
   - No capture-related startup lines yet — wiring lands next commit.
4. Read through `src/main/services/capture.service.ts` — the step comments in `screenshot()` are the contract. If any future diff moves step 3 below step 4, we've broken the invariant.

### Next

PH2-2: wire a minimal `SessionService` (just `getSessionContext`) + a `RandomCaptureSource` for dev testing, register the real `capture:screenshot` IPC, and run the first end-to-end fake capture through the pipeline on Asus.

---

## [RESOLVED 2026-04-23] FUI-7: Sidebar padding fix + dashboard metric-card polish

**From:** CTS (Claude Code)

Per the standing "Dashboard sidebar padding + post-onboarding shell polish" plan item.

### Sidebar padding — root cause + fix

**Problem:** the collapsed nav rail (48 px) has 8 px of internal padding on `.nav-sidebar`, giving a 32 px interior. `.nav-item` shipped with `padding: 0 12px` and a 16 px icon = 40 px wide total, so every icon overflowed the rail by 8 px. Icons appeared left-shifted and the hover background was clipped.

**Fix (`src/renderer/styles/components.css`):**
- Added a collapsed-state override: `.nav-sidebar.collapsed .nav-item, .nav-sidebar.collapsed .nav-sidebar-toggle { padding: 0; gap: 0; justify-content: center; }`. Icons now centre cleanly in the rail.
- Bumped nav icon from `--icon-xs` (16 px) to `--icon-sm` (20 px) to match the Windows 11 Fluent Navigation View spec. `.nav-item-icon > svg` forces the inner Fluent SVG to 20 × 20 regardless of its default `1em` inherit.
- Active accent bar redesigned: was a ~20 px rectangle at `left: 0; top: 10px; bottom: 10px`; now a vertically-centred **16 × 3 px pill** at `left: 2px` (height grows to 20 px on collapsed rows for visibility). Matches Windows 11's accent indicator.

### Dashboard metric cards

Promoted the inline-styled metric card to a real `.metric-card` / `.metric-card-label` / `.metric-card-value` ruleset in `components.css`:
- `layer-1` background + 1 px subtle divider border (reads as a card, not a coloured block).
- Hover: border flips to accent, adds `--shadow-layer-1`, feels interactive even though it isn't a button.
- 160 ms transitions.

`DashboardPage.tsx` now uses the class names instead of inline style objects.

### Files touched

- `src/renderer/styles/components.css` — sidebar collapsed overrides, icon size, accent pill, new `.metric-card*` rules.
- `src/renderer/pages/DashboardPage.tsx` — swap inline styles for `.metric-card*` classes.

### Checklist for Asus

1. `git pull --ff-only`
2. `npm run report` — expect PASS (typecheck + tests + benchmark unchanged; no IPC or schema changes).
3. `npm run dev`:
   - **Sidebar expanded (220 px):** 20 px icons with the familiar label + 12 px gap; active item shows a 3 × 16 px accent pill on the left edge and the accent-tinted row background.
   - **Sidebar collapsed (48 px):** click the Menu button; icons re-centre with no horizontal overflow, no clipping, hover background fills the row evenly, active-state pill still visible at `left: 4px`.
   - **Dashboard metric cards:** layer-1 background with a 1 px border; hover turns the border accent-blue and lifts a subtle shadow; skeleton cards inherit the same card chrome.
4. Light + dark theme both clean (cards use `layer-1` / `stroke-divider` tokens that already flip per theme).

### Next

After Asus verifies this commit: Phase 1 closes. Per plan → **Phase 2 Week 7** opens with the **Capture pipeline** (CaptureService + toolbar + annotation editor + session gallery).

---

## [RESOLVED 2026-04-23] FUI-6c: Revert step icons to Fluent + Fluent scrollbars + trim brand-SVG set (closes onboarding for real)

**From:** CTS (Claude Code)

Per direct user ask: keep the Fluent look for onboarding step headers (saturated coloured orbs, mono Fluent glyphs) and restrict the custom brand SVGs to only the Vision-EviDex identity surfaces.

### Reverts

- `.icon-orb` / `.icon-orb-{accent,success,warm,cool,violet}` restored to the pre-FUI-6b solid gradient fills with `color: #FFFFFF`. `orb-breathe` animation restored.
- All 7 onboarding step headers switched back to their original Fluent icons:
  - `LicenceStep` → `KeyRegular`
  - `WelcomeTourStep` → `SparkleRegular`
  - `UserProfileStep` → `PersonAccountsRegular`
  - `BrandingStep` → `BuildingRegular`
  - `DefaultTemplateStep` → `TextAlignLeftRegular`
  - `HotkeyConfigStep` → `KeyboardRegular`
  - `ThemeStorageStep` → `PaintBrushRegular`
- `SummaryStep` step icon is now `CheckmarkCircleRegular` (still wrapped in `StepLayout` with "You're all set" heading/subtext and the `.summary-row` cards from FUI-6b — user wanted that polish kept).

### Trimmed

`src/renderer/components/brand/BrandIcons.tsx` reduced to **two** exports:
- `AppMark` — used in `TitleBar.tsx`.
- `OnboardingHero` — used in `WelcomeBrandingStep.tsx`.

Removed the 8 `Step*` components.

Under `build/icons/` 20 files removed (8 step pictograms + preview sheet + 5 status tags + 6 nav variants). 15 files kept — exactly the packaging set the user listed:

```
build/icons/
├── app-icon-{1024,512,256,128,64,48,32,16}.svg
├── app-icon-taskbar-32.svg
├── favicon-32.svg
├── tray-icon-{light,dark}.svg
├── onboarding-hero-animated.svg
├── report-default-branding.svg
└── icon-manifest.md
```

`icon-manifest.md` rewritten to reflect the trimmed scope.

### Fluent scrollbars (new)

`src/renderer/styles/global.css` now ships a Fluent-correct scrollbar: 12 px wide, transparent track, pill-shaped thumb (3 px transparent border with `background-clip: padding-box` — the inset-pill trick), thumb colour `rgba(0,0,0,0.22)` (light) / `rgba(255,255,255,0.22)` (dark), deepens on hover/active, 120 ms colour transition. `::-webkit-scrollbar-button` disabled. Firefox covered via `scrollbar-width: thin` + `scrollbar-color`. Applies globally so every scroll context (card internals, sidebar, preview, long onboarding steps, future dashboard) gets it for free.

### Design-system audit

Cross-checked onboarding against `Docs MD/07-VisionEviDex-FluentUI-DesignSystem-v1_0.md`:
- Tokens (`--color-layer-*`, `--color-fill-*`, `--color-stroke-control`): ✓
- Materials (`material-mica`, `material-acrylic`): ✓
- Components (`card-elevated`, `btn-accent`/`btn-standard`/`btn-subtle`, `field-floating`, `step-indicator`): ✓
- Step header pattern (icon orb + `type-title` + `type-body` subtext): ✓
- Step transitions (`pageForward`/`pageBack` framer-motion variants): ✓
- Navigation row (Skip left, Back+Next right, Get Started accent on final): ✓ (step 1 overrides with a centred Begin per user ask)

One intentional divergence from §S-02 Step 8: Summary uses `.summary-row` cards instead of the spec's `<dl>` description list — direct user preference, same edit-jump behaviour.

### Checklist for Asus

1. `git pull --ff-only`
2. `npm run report` — expect PASS.
3. `npm run dev`, walk the onboarding:
   - **Welcome** step: still shows the animated aperture hero (kept).
   - **Title bar**: still shows the navy `AppMark` top-left (kept).
   - Every other step header: **coloured saturated gradient orb with a white Fluent glyph**, same look as before FUI-6a. Breath animation back on accent-palette orbs.
   - **Summary** step: still wrapped in StepLayout with `CheckmarkCircleRegular` on a green success orb, "You're all set" heading, 6 `.summary-row` cards (hover turns border accent-blue, Edit links still jump).
4. No references remain to `StepActivate` / `StepWelcome` / `StepProfile` / `StepBranding` / `StepTemplate` / `StepHotkeys` / `StepAppearance` / `StepComplete` in source (`grep` should return zero).
5. **Scrollbars**: scroll inside any card or long onboarding step — thin 12 px pill thumb, transparent track, darkens on hover and again on drag. Light and dark theme both legible.

### Next

Onboarding truly closed. Ready for **FUI-7 — Dashboard sidebar padding + post-onboarding shell polish**.

---

## [RESOLVED 2026-04-23] FUI-6b: Orb contrast fix + Summary step polish (closes onboarding)

**From:** CTS (Claude Code)

Closes the onboarding track. Two user-visible fixes and a polish pass.

### 1. Icon orbs fight the brand icon gradients

Before: `.icon-orb-accent` (and siblings) used a solid saturated gradient fill — same palette as the brand SVG glyphs we wired in FUI-6a. Result: gradient-on-gradient, the step icons barely read.

After: `.icon-orb` is now a **soft backplate**: `layer-1` base, a palette-tinted linear gradient overlay (≈12–16 % opacity), a Fluent-style white top-left gloss, and a 1.5 px inset ring in the palette accent. Shadow is palette-matched rgba (no more global `--accent-r`). All five palettes (accent / success / warm / cool / violet) exposed via CSS custom properties (`--orb-tint-1`, `--orb-tint-2`, `--orb-ring`, `--orb-shadow`) so the pattern is swappable per palette.

Dark theme: same pattern over `--color-layer-2` with slightly punchier tint/ring opacities so the orb stays visible on dark Mica.

Also dropped the old `orb-breathe` box-shadow animation — it was overwriting the inset ring every tick. The subtle float (`orb-float`) still runs.

### 2. Summary step now uses StepLayout

Before: `SummaryStep` was a bare list of rows with no heading/icon, rendered directly inside the card — breaks the visual rhythm the other seven steps establish.

After: wrapped in `<StepLayout icon={StepComplete} palette="success" title="You're all set" subtext="…" />`. Review rows rebuilt as a dedicated `.summary-row` component:
- `layer-1` card surface, 1 px subtle divider border.
- Hover: border flips to accent, background lifts one layer.
- Uppercase micro-label + body value.
- Right-side Edit link styled as a subtle accent button with focus-visible ring.
- Goes through `useOnboardingStore.goTo(stepIndex)` — same jump-back behaviour as before.

### Files

- `src/renderer/styles/components.css` — `.icon-orb` + 5 palette variants re-skinned, summary-row rules added, `orb-breathe` removed.
- `src/renderer/onboarding/SummaryStep.tsx` — wrapped with `StepLayout`, `StepComplete` icon, heading + subtext, Tailwind utility classes swapped for dedicated `.summary-row` CSS.

### Checklist for Asus

1. `git pull --ff-only`
2. `npm run report` — expect PASS.
3. `npm run dev`, walk the onboarding end-to-end:
   - Every step's orb reads as a **soft tinted disc with a thin ring**, and the gradient brand icon sits **clearly** on top (no same-on-same blending).
   - Tour step (cool), Summary (success), Licence/Profile/Branding/Template/Hotkeys/Theme (accent) all render differently enough to tell the palettes apart.
   - Final step shows a centred StepComplete hero + "You're all set" + subtext + 6 review rows; hover turns row border accent-blue; clicking Edit jumps back to that step.
4. Flip theme to dark via the Theme step → orbs re-skin with the dark-theme tint/ring automatically; summary rows use `layer-1`-dark.

### Onboarding status

With this commit the onboarding track is **done**. Next per the plan is **FUI-7 = Dashboard sidebar padding + post-onboarding shell polish**.

---

## [RESOLVED 2026-04-23] FUI-6a: Wire brand icons into the renderer (fix for "old icons still showing")

**From:** CTS (Claude Code)

**Problem:** FUI-6 added the Fluent brand SVGs under `build/icons/` but the renderer was never updated to use them — onboarding still imported `@fluentui/react-icons` components like `ShieldCheckmarkFilled`, `KeyRegular`, `SparkleRegular`, etc. The `build/icons/` assets are the packaging source of truth (for `.ico` bundling) but Vite doesn't import them directly.

**Fix:** added `src/renderer/components/brand/BrandIcons.tsx` containing inline React-SVG twins of the SVG files — each component accepts `FluentIconsProps` so it drops into any `FluentIcon` slot (e.g., `StepLayout.icon`) without touching the type.

Components exported:
- `AppMark(fontSize)` — small aperture on navy rounded square, used in `TitleBar`.
- `OnboardingHero(size)` — full 200×200 animated aperture with all 5 `@keyframes` + `prefers-reduced-motion` fallback.
- `StepActivate`, `StepWelcome`, `StepProfile`, `StepBranding`, `StepTemplate`, `StepHotkeys`, `StepAppearance`, `StepComplete` — 32×32 step-header pictograms (rendered at ~36 px inside the StepLayout orb).

### Wired into

- `src/renderer/components/shell/TitleBar.tsx` — `ShieldCheckmarkFilled` → `AppMark fontSize={16}`.
- `src/renderer/onboarding/WelcomeBrandingStep.tsx` — removed the old shield orb; renders `<OnboardingHero size={120} />` directly.
- `src/renderer/onboarding/LicenceStep.tsx` — `KeyRegular` → `StepActivate`.
- `src/renderer/onboarding/WelcomeTourStep.tsx` — `SparkleRegular` → `StepWelcome`.
- `src/renderer/onboarding/UserProfileStep.tsx` — `PersonAccountsRegular` → `StepProfile`.
- `src/renderer/onboarding/BrandingStep.tsx` — `BuildingRegular` → `StepBranding` (field-level `BuildingRegular` inside the form kept — it's a different icon slot).
- `src/renderer/onboarding/DefaultTemplateStep.tsx` — `TextAlignLeftRegular` → `StepTemplate`.
- `src/renderer/onboarding/HotkeyConfigStep.tsx` — `KeyboardRegular` → `StepHotkeys`.
- `src/renderer/onboarding/ThemeStorageStep.tsx` — `PaintBrushRegular` → `StepAppearance`.

No other changes: `SummaryStep` has its own summary-row layout without a step icon; the per-choice sub-icons inside BrandingStep / ThemeStorageStep / WelcomeTourStep screens are still Fluent icons.

### Checklist for Asus

1. `git pull --ff-only`
2. `npm run report` — expect PASS.
3. `npm run dev`:
   - Onboarding **Welcome** screen: animated aperture/document/shield/scan hero in place of the old shield orb — the aperture breathes, the scan line sweeps, the shield rotates slowly.
   - Step headers (Licence → Profile → Branding → Template → Hotkeys → Appearance) render the brand step icons (gradient `#0078D4 → #00B4D8`) instead of Fluent mono icons.
   - Title bar top-left shows the rounded navy app mark, not the shield checkmark.

Everything else from FUI-6 still stands.

---

## [RESOLVED 2026-04-21] FUI-6: Onboarding close + Begin centered + brand icon system

**From:** CTS (Claude Code)

Three independent deliverables in one commit.

### 1. Onboarding can now be closed without completing setup

**Problem:** after FUI-5 the main window has `frame: false`, so the only caption buttons come from the renderer's `<TitleBar />`. Onboarding did not render the Shell and therefore had no visible min/max/close buttons — users were stuck.

**Fix:** mounted `<TitleBar title="Vision-EviDex · Setup" />` at the top of both branches of `OnboardingPage.tsx` (the wizard state and the transient `CompletedCard`). The Mica backdrop now flex-columns with the 32 px title bar on top and the wizard card filling the remainder. Close → window quits; `onboardingComplete` stays `false` in `settings.json`; next launch re-enters onboarding. Minimize and maximize also work, matching the rest of the app.

### 2. First onboarding step: Begin button centered, no Previous

**Fix:** the onboarding `Nav` component now has an early return when `isFirst === true`. It renders only the accent Begin button in a `justify-content: center` row, with the normal two-column Previous/Next layout starting on step 2. The `disabled` prop on the previous-previous button is gone (it was always disabled anyway on step 1 — now the whole button is gone).

### 3. Vision-EviDex icon system — 34 SVGs + manifest + build hook

Full Fluent Design 2 icon family lives under `build/icons/`. All icons follow the brand language: 135° linear gradient `#0078D4 → #00B4D8` (primary) or `#0078D4 → #6B2FBA` (secondary), rounded caps / joins, `<title>` + `<desc>` for a11y, `@media (prefers-color-scheme: dark)` where surface-dependent.

**App-shell (12 files):** `app-icon-{1024,512,256,128,64,48,32,16}.svg`, `app-icon-taskbar-32.svg`, `favicon-32.svg`, `tray-icon-{light,dark}.svg`. The 256 has a verified-checkmark inside the shield; 32 and below use the abstracted 6-point star form per the spec.

**Onboarding (10 files):** `onboarding-hero-animated.svg` (200×200 with 5 named `@keyframes`: aperture-pulse, scan-sweep, doc-float, glow-pulse, shield-rotate — all with a `prefers-reduced-motion: reduce` fallback), `step-01-activate.svg` through `step-08-complete.svg` (32×32 step-header pictograms), plus `step-icons-preview.svg` for visual review.

**In-app (12 files):** `report-default-branding.svg` (240×60 report header placeholder with UNBRANDED watermark), `status-{pass,fail,blocked,skip,untagged}.svg` (16×16 capture tags), `nav-{capture,evidence,audit}-{regular,filled}.svg` (20×20 sidebar nav with Regular + Filled variants — Regular uses `currentColor`, Filled uses the primary gradient).

**Manifest:** `build/icons/icon-manifest.md` — lists every file, dimensions, usage context, the exact bundle command for the Windows `.ico` (both `sharp` + `png-to-ico` and an ImageMagick alternative), and the `electron-builder.config.js` icon hook ready to drop in when packaging lands in Phase 4.

### Files touched

- `src/renderer/pages/OnboardingPage.tsx` — TitleBar import, wrapper restructure, Nav.isFirst branch.
- `build/icons/` — 34 SVG files + `icon-manifest.md`.

No test or schema changes; IPC count still `27 handlers registered (12 live, 15 stub)`.

### Checklist for Asus

1. `git pull --ff-only`
2. `npm run report` — expect PASS (typecheck + 189/189 tests + benchmark).
3. `npm run dev`:
   - Boot fresh userData (`predev` clears state).
   - Onboarding renders with the caption buttons (min/max/close) at top-right of the title strip.
   - Step 1 (welcome) shows only the centered accent Begin button, no Previous.
   - Click the caption close button → app quits. Relaunch → onboarding returns (onboardingComplete still `false`).
   - Click Begin → step 2; Previous button now visible.
4. Open a few of the SVG files in the browser / VS Code preview to sanity-check rendering of:
   - `build/icons/app-icon-1024.svg` — aperture iris + shield visible.
   - `build/icons/app-icon-256.svg` — shield has a white checkmark inside.
   - `build/icons/onboarding-hero-animated.svg` — aperture breathes, scan line sweeps, shield rotates slowly, document floats.
   - `build/icons/step-icons-preview.svg` — all 8 step glyphs in a row.
5. Confirm no stray `build/tmp/` files are committed (the `.ico` bundle command uses it as a scratch directory only).

### Notes

- Icons live under `build/icons/` so the `electron-builder` `directories.buildResources` default ('build') picks them up at packaging time without extra config.
- Actual `.ico` generation from SVGs is a build-time concern — the manifest has the exact command, but we only execute it when packaging (Phase 4). The SVG sources are authoritative until then.
- Tray service wiring is not done yet (still stubbed) — tray icons are included so we have the assets ready when `TrayService` lands.

---

## [RESOLVED 2026-04-21] FUI-5: Fully custom Fluent title bar + window controls

**From:** CTS (Claude Code)
**Why:** Replace the OS `titleBarOverlay` caption buttons with a fully React-owned implementation so we get pixel-perfect control over hover states, focus rings, restore/maximize icon swap, and theme sync — and so we stop relying on Electron's overlay API (it's Windows-only and its color contract is hard to match against Mica).

### Design summary

- Electron main window switched from `titleBarStyle: 'hidden'` + `titleBarOverlay` → `frame: false`. No OS chrome at all.
- Draggable strip: `.title-bar` uses `-webkit-app-region: drag`; caption buttons and icon opt out with `no-drag`. Double-click on the draggable area still toggles maximize (OS default under `app-region: drag`).
- Caption buttons are hand-drawn 10 × 10 inline SVGs (stroke-width 1) at 46 × 32 px, matching Windows 11 Fluent geometry (Segoe Fluent Icons E921–E923, E8BB visual equivalents). No webfont, no icon-lib dependency for the caption glyphs.
- Maximize ↔ Restore icon swaps live from a `window:maximizedChange` broadcast emitted by main on `maximize` / `unmaximize` / `enter-full-screen` / `leave-full-screen`.

### IPC changes

**Removed:**
- Channel `titleBar:setTheme`
- Schema `TitleBarSetThemeSchema` / `TitleBarSetThemeInput`
- Helper `updateTitleBarForTheme(win, theme)` in `src/main/window-manager.ts`
- Preload `window.evidexAPI.titleBar.setTheme(...)`

**Added (renderer → main invoke, 4 new):**
- `window:minimize`
- `window:maximizeToggle` (main checks `win.isMaximized()` and flips)
- `window:close`
- `window:isMaximized` → returns `boolean`

**Added (main → renderer event, 1 new):**
- `window:maximizedChange` → `boolean` (broadcast on maximize / unmaximize / enter-full-screen / leave-full-screen)

**Schema:** all four control channels share `WindowControlSchema = z.object({})` (no payload).

**Preload bridge:**
- `window.evidexAPI.windowControls.{ minimize, maximizeToggle, close, isMaximized }`
- `window.evidexAPI.events.onMaximizedChange(handler)` → returns off-fn.

**Handler count log:** now `(12 live, 15 stub)` — up from `(9 live, 15 stub)` by +3 net (removed 1, added 4).

### Files touched

- `src/shared/ipc-channels.ts` — swap `TITLE_BAR_SET_THEME` → 4 `WINDOW_*` channels + `WINDOW_MAXIMIZED_CHANGE` event.
- `src/shared/schemas/index.ts` — `TitleBarSetThemeSchema` → `WindowControlSchema`.
- `src/main/window-manager.ts` — drop overlay helpers, drop `nativeTheme` dep, switch main window to `frame: false`, wire maximize/unmaximize broadcasts.
- `src/main/app.ts` — drop `initialTheme` plumbing (no longer needed since the renderer owns the bar).
- `src/main/ipc-router.ts` — drop `TITLE_BAR_SET_THEME` handler, add four `WINDOW_*` handlers, update handler-count log.
- `src/preload/preload.ts` — expose `windowControls` API + `onMaximizedChange` event subscriber.
- `src/renderer/providers/ThemeProvider.tsx` — drop the `titleBar.setTheme(resolved)` call (no longer needed).
- `src/renderer/components/shell/TitleBar.tsx` — full rewrite with caption buttons, Fluent inline SVG glyphs, aria-labels, restore/maximize icon swap.
- `src/renderer/styles/components.css` — drop the `padding-right: 140px` reserve, add `.caption-buttons` + `.caption-button` (+ `--close` variant) with Fluent hover/active/focus-visible states.

### Accessibility

- Each caption button is a real `<button>` with `aria-label` + `title` (Minimize / Restore or Maximize / Close).
- Group wrapper is `role="group" aria-label="Window controls"`.
- Focus ring: inset 2px accent-coloured box-shadow on `:focus-visible`.
- Icons use `aria-hidden="true" focusable="false"`.
- Windows High Contrast: buttons use `currentColor` on the glyph so `forced-colors` stroke stays visible.

### Explicit non-goals (call these out on verification)

- **Snap Layouts flyout on maximize-button hover is not available.** Windows 11 only shows Snap Layouts for native caption buttons; a fully custom button cannot emit the right `WM_NCHITTEST` response from Electron. User explicitly asked for fully-custom, so this is the accepted trade-off.
- **No `remote` module, no deprecated APIs.** Everything goes through `contextBridge` + `ipcRenderer.invoke`.

### Checklist for Asus

1. `git pull --ff-only`
2. `npm run report` — expect PASS (typecheck + 189/189 tests + benchmark).
3. `npm run dev`:
   - Startup logs: `[ipc-router] 27 handlers registered (12 live, 15 stub)`.
   - No `did-fail-load`, no preload errors.
4. Manual visual checks:
   - Title bar renders with app icon + title on the left, three caption buttons flush right.
   - Hover minimize / maximize / restore → subtle neutral fill.
   - Hover close → red `#C42B1C`, white glyph.
   - Double-click draggable area → window maximizes; maximize icon becomes restore icon; double-click again → restores.
   - Drag title bar → window moves.
   - Toggle theme in Onboarding Theme/Storage step → caption strip and glyph colours flip in sync (no OS overlay to race against).
   - No black/grey strip under the caption area in light theme.
5. Tab into a caption button → visible focus ring (inset accent).

Everything from FUI-4f remains intact.

---

## 2026-04-19 — FUI-4g: Caption-button theme race fix (small)

**From:** CTS (Claude Code)
**Why:** After FUI-4f the user still saw the light-theme caption buttons flip back to a dark overlay whenever the OS theme changed. Root cause was a duplicate authority in `src/main/window-manager.ts`: both the renderer (authoritative, user preference aware) *and* a `nativeTheme.on('updated')` listener in main were calling `setTitleBarOverlay`. When OS theme differed from the in-app choice (e.g. user picked `light`, OS is dark), the main-side listener would overwrite the renderer's correct value.

### Fix

- Removed the redundant `nativeTheme.on('updated')` handler from `createMainWindow()` in `src/main/window-manager.ts`.
- Renderer's `ThemeProvider` (via `titleBar:setTheme` IPC) is now the single source of truth. It already re-resolves on OS flips through the `theme:systemThemeChange` broadcast and respects `light`/`dark`/`system` preference.
- Initial boot overlay is still resolved main-side from `settings.theme`, so there is no flash before the renderer mounts.

### Checklist for Asus

1. `git pull --ff-only`
2. `npm run report` — expect PASS (typecheck + 189/189 tests + benchmark).
3. `npm run dev`:
   - Startup: no `did-fail-load`, no preload errors.
   - **`[ipc-router] 24 handlers registered (9 live, 15 stub)`** still shows (FUI-4f IPC stays registered).
   - **`theme.broadcasts-bound`** still logs accent + darkPreferred.
4. Manual: open Onboarding → step 8 (Theme & storage) → flip `light` ↔ `dark` ↔ `system`; caption buttons + content should stay in sync, including when OS theme is the opposite of your chosen preference.

Everything else from FUI-4f remains as-is (profile validators, Fluent dropdown, template preview accent + skeleton).

---

## 2026-04-19 — FUI-4f: Onboarding polish (profile dropdown + template preview + title bar)

**From:** CTS (Claude Code)
**Why:** Three fixes called out after the FUI-4e visual review:

### 1. Title bar overlay was painting dark on light content

- Default `Settings.theme` changed from `'system'` to `'light'` so first-launch after install is coherent. User can change during the onboarding Theme/Storage step or later under AppSettings → Appearance.
- **New IPC** `titleBar:setTheme` (renderer → main invoke). Schema `TitleBarSetThemeSchema = { theme: 'light' | 'dark' }`.
- `ThemeProvider` now calls `window.evidexAPI.titleBar.setTheme(resolved)` inside the same effect that writes `data-theme` so the overlay flips in lock-step with the content.
- `createMainWindow()` gained an optional `initialTheme` argument; `app.ts` resolves it from `settingsService.getSettings().theme` at boot (treating `system` as `nativeTheme.shouldUseDarkColors`) so the overlay is correct before the renderer has mounted — no more dark caption strip on a light app.
- IPC handler-count log now reads `(9 live, 15 stub)`.

### 2. Profile dropdown was white / non-themed

- Native `<select>` in Chromium opens an OS-rendered popup that ignores CSS. Replaced with a **custom `FluentSelect`** (inline in `UserProfileStep.tsx`) — a transparent underline button + portalled popover.
  - New CSS: `.fluent-select`, `.fluent-select-button`, `.fluent-select-popover`, `.fluent-select-option(.selected)`.
  - Popover uses `--color-layer-2` / `--shadow-layer-2` so it's dark in dark theme and light in light theme.
  - Chevron rotates 180° while open; selected option shows `CheckmarkRegular` in accent; hover + keyboard ESC close supported; click-outside closes via `pointerdown` listener.
  - Field icon is coloured in accent by default (matching the rest of the form).

### 3. Profile validation

- All four visible inputs are now required: first name, last name, email, role. When "Other" is selected, the inline "Describe your role" field is also required before outer Next enables.
- Bug fix: previously, typing the custom role did not unlock Next because the store still held `role: ''`. New `setProfile()` derives `role` from `customRole` whenever the draft is in "Other mode" (detected via `customRole !== undefined`). Picking a built-in role again clears `customRole` and restores the plain selection.
- Validator `isValidUserProfile` now checks: firstName+lastName (if draft-shape) OR composed name, required non-empty role, required well-formed email. Tests in `onboarding-validators.spec.ts` updated.

### 4. Template preview is now dynamic

- Reads `branding.primaryColor` from the onboarding store (falls back to `#0078D4` if no branding entered yet).
- Accent blocks in the per-template preview use that colour directly (plus alpha tints for secondary fills). Makes the preview match what the exported report will actually look like.
- Non-accent blocks now use the `.skeleton` class so they shimmer — the preview visibly breathes rather than sitting as static grey rectangles. Reduced-motion freezes the shimmer (already handled in `loading.css`).
- Preview heights compacted (all sizes ~40% smaller) so the block proportions read as a 1-page document rather than a tall card.
- Selected template card's icon tile now tints to the user's primary colour too, so the left / right sides of the layout stay in sync visually.

### Tests

- `onboarding-validators.spec.ts` rewritten for the new profile rules (firstName+lastName+email all required; role still required).
- `settings-service.spec.ts` default-theme assertion: `'light'` (was `'system'`).

### What did NOT change

- Persisted data shape (settings.profile.name / role / email / team) is unchanged — the draft still composes `name` from first+last before calling `setStepData`.
- No new dependency.
- Dashboard / AppSettings not touched.

### Verification ask

1. `git pull`
2. `npm run report` — expected **PASS**. Tests unchanged at **189/189**; the rewritten profile and settings-service cases don't change the count.
3. `npm run dev` (fresh, reset runs):
   - **Title bar**: strip colour matches the app content (no black-looking caption region on a light app, no light strip on a dark app).
   - **Theme on first launch**: light, not system. Onboarding Theme step will flip it if the user picks dark.
   - **Profile step**: role dropdown is now a custom Fluent popover. Transparent button; click opens a dark-on-dark / light-on-light list; ESC closes; selected option highlighted in accent. All four left/right inputs have red `*` markers. Next stays disabled until first+last+email+role are all filled; picking "Other" + typing a custom role unlocks Next.
   - **Template step**: preview thumbnail reflects the primary colour you typed on the Branding step (change Branding → Primary colour, come back to Template → preview should use the new colour). Non-accent blocks shimmer softly (reduced-motion freezes them).
4. Tests: expected **189/189 PASS**.

Once this is green we move on to the Dashboard sidebar padding polish.

---

## 2026-04-19 — FUI-4e: Onboarding premium redesign (8 → 9 steps)

**From:** CTS (Claude Code)
**Why:** Onboarding visual overhaul per the design brief. Centred Fluent layout on every step with an animated gradient icon orb, transparent underline-only inputs (no blue focus border), colour-coded per-step palettes, 2-column forms where dense, and premium cards for templates and themes. Also adds a **new welcome/brand screen** as the very first step.

### Step flow change — 8 steps became 9

New first step `welcome` — the Vision-EviDex brand screen with a large animated shield orb, split-colour wordmark, and a tagline. Every mode now starts here. Sequence:

| # | id | Scope |
|---|----|-------|
| 1 | `welcome` | **NEW** brand splash (Begin button) |
| 2 | `licence` (keygen only) | Verify flow |
| 3 | `tour` (optional) | 3-screen carousel |
| 4 | `profile` | Profile form |
| 5 | `branding` | Organisation + logo |
| 6 | `template` | Default template picker |
| 7 | `hotkeys` | Shortcut remap |
| 8 | `themeStorage` | Theme + storage |
| 9 | `done` | Summary |

### Per-step redesign

- **WelcomeBrandingStep.tsx (new)** — 96px animated accent orb (`ShieldCheckmarkFilled`), `type-title-large` wordmark with the `-EviDex` suffix tinted in accent, single-line tagline. OnboardingPage sets the primary action label to "Begin" on this step.
- **LicenceStep** — Key orb, transparent key field with `KeyRegular` icon, **Verify button**. After `licence.activate()` resolves:
  - success → green `verify-status` pill "Thanks for choosing Vision-EviDex — click Next to proceed." + outer Next unlocks (new `isValidLicence` validator checks `verified === true`).
  - failure → red pill with the exact error from the IPC result.
  - The input becomes read-only after a successful verify; typing again clears verification.
- **WelcomeTourStep** — three carousel screens, each with its own palette-coloured 56px orb (cool / warm / violet) + Fluent icon. Internal nav buttons now have leading `ChevronLeftRegular` / trailing `ChevronRightRegular` + "Previous" / "Next" labels.
- **UserProfileStep** — 2-column grid. Row 1 First name / Last name, row 2 Email / Team, row 3 Role. When Role = "Other" a sixth field appears for a custom role string. Each field is a transparent underline input with a coloured Fluent icon on the left. First+last are concatenated into `profile.name` for the existing persist contract; custom role writes through to `profile.role`.
- **BrandingStep** — company/colour/header/footer grid, then a drop-style logo upload zone with its own small orb + inline file-picker label styled as a compact button. Below: a **live Fluent preview strip** that renders the logo + company + header as they'll appear in exported reports, with a top accent-coloured bar.
- **DefaultTemplateStep** — **2-column layout**: left is the template card selector (5 premium cards, each with a small icon tile + name + description, selected gets a 2px accent border + accent-subtle glow); right is an **A4-proportioned skeleton preview** with per-template block layouts. `tpl_tsr_standard` is auto-selected on first render.
- **HotkeyConfigStep** — centred keyboard orb; six setting rows with `key-chip` remap; duplicate-binding warning reused from AppSettings.
- **ThemeStorageStep** — three **theme cards** (Light / System / Dark) each with a mini shell preview (title bar, sidebar, accent line) — the user sees the actual colour scheme not just a label. Storage folder uses a transparent field with `FolderRegular` icon + compact Browse button.

### Supporting CSS added to `components.css`

- `.icon-orb` + `.icon-orb-accent` / `-success` / `-warm` / `-cool` / `-violet` — gradient orbs with glow and size variants 56 / 72 / 96.
- `@keyframes orb-float` + `orb-breathe` — subtle float + glow pulse; `.icon-orb-animated`; all killed under `prefers-reduced-motion`.
- `.field-floating` / `.field-floating-label` / `.field-icon` — transparent underline inputs with coloured icon slot, no solid fill, no blue bottom border at rest, accent underline on focus, red on invalid.
- `.template-card(.selected)` + `.template-card-icon/.name/.description` + `.template-preview(.block)` — template picker cards and A4 skeleton.
- `.theme-card(.selected)` + `.theme-card-swatch*` with per-variant variations via `[data-theme-variant]` — shell-preview mini widgets.
- `.verify-status.success/.error` — inline result pills for the licence step and elsewhere.

### OnboardingPage wiring

- Dispatches `welcome` → `WelcomeBrandingStep`.
- Page-level icon/title/description moved **into** each step's `StepLayout` — the card no longer duplicates a header row. The step-dot indicator + card + nav are all that OnboardingPage owns.
- Nav row: Back becomes **"Previous"** with a leading chevron, Next gets a trailing chevron, Skip label is **"Skip tour"** when on the tour step else "Skip for now", primary label on welcome is **"Begin"** (final step stays "Get Started").

### Tests updated

- `__tests__/onboarding-store.spec.ts` — step count assertions now use `ONBOARDING_STEPS.length` (dynamic), index-0 assertions changed to `'welcome'` for both modes, added "index 1 is licence/tour" assertions.
- `__tests__/onboarding-validators.spec.ts` — added a case for `isValidLicence` (unverified → false, `{ verified: true }` → true); removed `licence` from the form-less pass-through case.

### Verification ask

1. `git pull`
2. `npm run report` — expected **PASS 189/189** (tests updated, no net count change). Most at-risk:
   - `@fluentui/react-icons` name resolution across the many new imports (PersonAccountsRegular, TextTRegular, TextAlignLeftRegular, ColorRegular, ImageAddRegular, ClipboardTaskListLtrRegular, BugRegular, WeatherSunnyRegular, WeatherMoonRegular, DesktopRegular, ErrorCircleRegular, etc.). Paste any unresolved names verbatim and I'll swap in alternates.
   - `FluentIconsProps` typing in `StepLayout.tsx` — should be identical to what worked in OnboardingPage's typed map.
3. `npm run dev` (fresh — the dev-reset will fire):
   - **Screen 1**: Brand splash with "Vision-EviDex" wordmark, tagline, Begin button centred at the bottom. Icon orb floats gently (reduced-motion respected).
   - **Screen 2 (none mode)**: Tour with three colour-coded icons. Prev/Next buttons have chevron icons.
   - **Screens 3-8**: Profile (2-col), Organisation (2-col + logo preview), Template (2-col cards + preview skeleton; TSR selected by default), Hotkeys (key chips), Theme/Storage (3 theme cards + folder picker).
   - On the licence step (keygen mode): typing a short key and clicking Verify shows the red error; a ≥10-char key + successful `licence.activate` shows the green pill and unlocks Next.
4. Tests: **189/189 PASS**.

Once this is green we move on to the **Dashboard padding polish** the user flagged on the sidebar icons.

---

## 2026-04-19 — FUI-4b + 4c + 4d: D25 screens ported to doc §15

**From:** CTS (Claude Code)
**Why:** Final FUI-4 push. All three existing D25 screens now render under the Fluent design system per doc §15 specs (S-02, S-03, S-23). After this, the user-visible surface area matches the design doc end-to-end. FUI-5 is the mechanical cleanup of the `DEPRECATED` alias layer.

### FUI-4b — DashboardPage → S-03

- Header title uses `type-title` (28/600) + display font; subtitle uses `type-body secondary`; right side shows "No session active" in caption mono until SessionService lands in Phase 2.
- 4 metric cards redesigned: `--color-fill-subtle` tile, `--radius-card`, no border, no shadow. Label = caption + uppercase + tracking; value = `type-title` in display font.
- Quick-action row replaces the old 4 custom buttons with 4 Fluent `Button` primitives (`variant="standard"`) + leading 20px Fluent icons: `CameraRegular` (New session), `AddRegular` (New project), `ArrowUploadRegular` (Import metrics), `DocumentTextRegular` (Recent reports). Auto-fit grid.
- Recent projects is now a `Card` with a flex header row ("Recent projects" in `type-body-strong` + "View all" link in accent caption), 48px rows with `FolderRegular` 16px icon + project name + mono path + timestamp tertiary. New `.recent-project-row` CSS class gives the fill-secondary hover.
- Empty state: centred card interior with `SparkleRegular` 48px tertiary, subtitle "Welcome to Vision-EviDex", body copy, accent "Create project" button with `AddRegular`.
- Metric skeletons redesigned to match the new tile layout.

### FUI-4c — AppSettingsPage → S-23

- Title "Settings" (title role, display font).
- **Pivot pill tabs** — new `.pivot-tabs` + `.pivot-tab` CSS. 32px strip in `--color-fill-secondary`, active tab gets `--color-layer-1` + `shadow-card` + body-strong weight. Exactly the Fluent WinUI 3 pivot look, not underline.
- All six tabs inside a single `<Card>` max-width 640px. Each setting rendered as a `SettingRow` (new helper inside the file) — 44px flex, label left + optional hint caption, control right.
- **Profile tab**: avatar circle (new `.avatar` class — 44px, `--color-fill-accent-subtle` bg, `--color-accent-default` text, initials via `initialsOf()`) + name/role readout above the Name / Role / Team / Email inputs. Empty-profile initials fall back to "?".
- **Hotkeys tab**: each action row uses the new `.key-chip` class (mono, fill-secondary, 56px min-width) with remap click handler intact. Conflict rows get `.key-chip.conflict` (fail colours).
- **Appearance tab**: 3-option **segmented control** (light / system / dark) using new `.segmented` + `.segmented-option.active` CSS. Selected segment takes `--color-accent-default` fill with white text. Hint below explains theme changes take effect on next launch until a settings-updated broadcast is wired in FUI-5+.
- **Storage tab**: kept single `defaultStoragePath` (schema has one path today; doc mentions two but that's future). Path input in mono + "Browse…" compact standard button.
- **Defaults tab**: template radio rows restyled with proper border colours (accent when selected) + caption body typography.
- **Licence / About tab**: mode-aware. `none` mode shows Enterprise badge + explanatory caption under a divider. `keygen` mode shows "Standard (Keygen.sh)" + placeholder status.
- Skeleton loader simplified to three Fluent shimmer blocks.

### FUI-4d — OnboardingPage → S-02

- Full-viewport mica background — no sidebar, no shell, per doc ("Full-window, no sidebar").
- **Step indicator** at the top: 6px dots, 16px connectors, `.step-dot.done` (accent fill) / `.step-dot.current` (accent fill + 2px ring) / stroke-default outline otherwise. Indicator announces `Step N of M` via aria-label.
- **Step card** is `card-elevated` with `padding: 32px 32px 24px` + `--radius-dialog`.
- **Per-step icon** (32px, accent colour) at the top of the card — a typed `FluentIcon` component map:

| Step | Icon |
|---|---|
| licence | `KeyRegular` |
| tour | `SparkleRegular` |
| profile | `PersonRegular` |
| branding | `BuildingRegular` |
| template | `DocumentTextRegular` |
| hotkeys | `KeyboardRegular` |
| themeStorage | `PaintBrushRegular` |
| done | `CheckmarkCircleRegular` |

- **Title** in display-font `type-title`; **description** in `type-body secondary`.
- **Motion**: step body wrapped in `AnimatePresence mode="wait"` with `pageForward` / `pageBack` variants. Direction tracked locally — `next()`/`skip()` set forward, `back()` sets back. `key={step.id}` on the motion div triggers the exit-then-enter cycle. Framer Motion durations respect the `prefers-reduced-motion` zeroing in tokens.css.
- **Nav row** outside the card: `Button` primitives. Back (subtle, disabled on first step), Skip-for-now (subtle, only on optional non-last steps), Next (accent), final step shows **"Get Started"** (accent) instead of "Next".
- **Completed state** gets its own centred card-elevated with a 48px `CheckmarkCircleRegular` in success colour + "Onboarding complete" title + "Reset" standard button.
- Step body components (`LicenceStep`, `UserProfileStep`, `BrandingStep`, etc.) are **unchanged** — they still render via the existing `renderStepBody` dispatch. Their internal forms still use native inputs; swapping them to Fluent primitives is a follow-up if you want it in FUI-5, otherwise the per-step polish lands alongside the real form behaviour (e.g. file upload, colour picker).

### Supporting CSS added to `components.css`

- `.pivot-tabs` / `.pivot-tab(.active)` — Fluent pivot pill style.
- `.setting-row` / `.setting-row-label` / `.setting-row-control` / `.setting-group-label` — 44px setting rows.
- `.avatar` — 44px initials circle.
- `.segmented` / `.segmented-option(.active)` — 3-option Appearance control.
- `.key-chip(.conflict)` — hotkey binding chip.
- `.recent-project-row` — Dashboard list row with hover.
- `.step-indicator` / `.step-dot(.done|.current)` / `.step-connector` — onboarding step dots.

### Barrel fix that bit us late

`ui/index.ts` re-exports `Skeleton as FluentSkeleton`. My first pass on DashboardPage and AppSettingsPage wrote `import { Skeleton as FluentSkeleton } from '../components/ui'` — which tried to import a `Skeleton` the barrel never exports. Caught by IDE diagnostics; fixed both call sites to `import { FluentSkeleton }` directly before push. Worth a look on your end if the typecheck surfaces any other drift from the rename.

### Dev behaviour

This commit is orthogonal to the `dev:reset` + `dev:keep` scripts you just verified. Use `npm run dev` to exercise the onboarding flow fresh; `npm run dev:keep` after you've completed it once to iterate on Dashboard + AppSettings without re-doing onboarding.

### Verification ask

1. `git pull`
2. `npm run report` — expected **PASS 189/189**. Most at-risk:
   - Fluent icon names in OnboardingPage / DashboardPage (KeyRegular, SparkleRegular, PersonRegular, BuildingRegular, KeyboardRegular, PaintBrushRegular, CameraRegular, AddRegular, ArrowUploadRegular, DocumentTextRegular, FolderRegular, CheckmarkCircleRegular). Paste any unresolved name verbatim.
   - The ported `AppSettingsPage` kept the same schema contract (`settings:update` payload shapes) but restructured internal components — if any of the onboarding utility imports (`HOTKEY_ACTIONS`, `DEFAULT_HOTKEYS`, `BUILTIN_TEMPLATES`, `detectHotkeyConflicts`, `formatKeyEvent`) has silently changed since D22 please flag.
3. `npm run dev`:
   - Onboarding renders with: 8 step dots across the top (current is accent+ring, future are outlined), a coloured step icon above the title, card-elevated styling, Back/Skip/Next/Get Started buttons. Step transitions should slide horizontally.
   - After Finish → Dashboard appears inside the Shell with 4 Fluent metric tiles, 4 quick-action buttons with icons, and either the recent-projects card or the empty state depending on your `app.db`.
   - Sidebar → Settings opens the pivot-tab page with 6 tabs; each tab content lives in a 640px card. Appearance's segmented control should highlight the active option in accent.
4. Tests: expected **189/189 PASS**. No test imports from the ported pages.

If all green, FUI-5 is next: grep the repo for `DEPRECATED` and delete every matching line from `tokens.css` + `tailwind.config.js`. That cleanup should be entirely mechanical.

---

## 2026-04-19 — DEV: `npm run dev` now resets onboarding state between runs

**From:** CTS (Claude Code)
**Why:** During the active UI-redesign phase the developer wants `npm run dev` to always boot into the Onboarding wizard so they can re-verify the whole first-run flow (tester info, organisation info, branding upload, template pick, hotkey remap, theme/storage). Pre-change, settings.json persisted between runs and the second `npm run dev` jumped straight to the Dashboard.

### Changes

**`scripts/reset-dev-state.js`** — new. Deletes these specific files from `<appData>/VisionEviDex/`:
- `settings.json`          — clears `onboardingComplete` + theme + storage path
- `licence.sig`            — no-op in `none` mode, cleared anyway for parity
- `app.db`, `app.db-journal`, `app.db-wal`, `app.db-shm` — wipes `branding_profiles` and `recent_projects` rows so the wizard re-collects them

Kept intentionally:
- `logs/` — historical boot logs remain readable across resets

Safety:
- Refuses to run if the resolved path leaf isn't `VisionEviDex`
- Each file delete wrapped in try/catch so a locked file just logs a warn rather than aborting the whole reset (e.g. if a prior dev run is still holding `app.db-wal`)

Cross-platform path resolution: Windows `%APPDATA%`, macOS `~/Library/Application Support`, Linux `$XDG_CONFIG_HOME` (falls back to `~/.config`).

**`package.json`** — script rewrite:

```diff
+ "dev:reset":    "node scripts/reset-dev-state.js",
- "predev":       "npm run rebuild:electron",
+ "predev":       "npm run dev:reset && npm run rebuild:electron",
  "dev":          "electron-vite dev",
+ "predev:keep":  "npm run rebuild:electron",
+ "dev:keep":     "electron-vite dev"
```

### Usage

- **`npm run dev`** — fresh state every time. First screen is always the Onboarding wizard. Ideal for iterating on the onboarding flow, which is exactly where FUI-4d lands next.
- **`npm run dev:keep`** — escape hatch. Skips the reset and boots with whatever state was last persisted. Useful when iterating on the Dashboard or AppSettings without re-doing onboarding every time.
- **`npm run dev:reset`** — reset without launching the app (manual use).

### What did NOT change

- No renderer/main code was touched — this is a dev-workflow change only.
- `npm run build`, `npm run report`, `npm run test` are all unchanged. Production behaviour is identical.
- No tests affected.

### Verification ask

1. `git pull`
2. `npm run report` — expected **PASS 189/189**. The report pipeline never launches dev, so this confirms nothing else drifted.
3. First `npm run dev`:
   - Console prints `[dev-reset] cleared N state file(s) from <path> (logs/ kept).` before the app boots.
   - The app opens into the Onboarding wizard (not the Dashboard), even if you had previously completed onboarding.
4. Second `npm run dev` (after any onboarding activity):
   - Same message — cleared N state files again.
   - Still opens into the Onboarding wizard.
5. `npm run dev:keep`:
   - No reset message.
   - App opens directly into Dashboard (if a prior run completed onboarding), or into Onboarding (if state is already clean).

If anything about the reset path resolution fails on your Windows 11 setup, paste the exact `[dev-reset]` output line — the Windows branch uses `process.env.APPDATA` with a fallback to `os.homedir()/AppData/Roaming`.

---

## 2026-04-19 — FUI-4a: Shell owns padding; redundant nav buttons removed

**From:** CTS (Claude Code)
**Why:** First of four FUI-4 sub-commits porting D25 screens to doc §15. 4a is the cosmetic cleanup flagged at the end of FUI-3 — still no screen-level redesign. 4b/4c/4d follow in order once this gate is green.

### Changes

- `components.css` — `.shell-content` now has `padding: var(--space-6)` (24px on all sides per doc §4.5). New `.shell-content-column` utility applies `max-width: 1200px; margin: 0 auto` for pages that want the centred column.
- `DashboardPage.tsx` — removed `min-h-screen bg-surface-primary p-6 md:p-10` outer wrapper and the inner `max-w-5xl mx-auto space-y-8` div; the page now renders directly inside Shell. Removed the in-page "Settings" button in the header (Sidebar handles Settings nav). Root element switched to `shell-content-column` with flex-column + `space-y-8` semantics via inline style.
- `AppSettingsPage.tsx` — same treatment: outer `min-h-screen` + `max-w-4xl` removed; root is `shell-content-column`. Removed the "← Dashboard" back button in the header (Sidebar handles Dashboard nav). Dropped the unused `useNavStore` import as a result.
- Skeleton variant on both pages updated to use the new page structure too — no double-padded boot skeletons.

### What did NOT change

- No primitive in `components/ui/` was touched.
- No screen-level content or logic was rewritten (that's FUI-4b/4c/4d).
- No test was touched; 189 specs still valid.

### Verification ask

1. `git pull`
2. `npm run report` — expected **PASS 189/189**. Most at-risk: the unused-import rule on `AppSettingsPage.tsx` (removed `useNavStore`).
3. `npm run dev`:
   - Dashboard content should now fit cleanly inside the Shell with a single 24px inset (no more ~48–64px double padding against the sidebar).
   - No "Settings" button in the Dashboard header; Sidebar's Settings row is the only path.
   - AppSettings page has no "← Dashboard" back button; Sidebar's Dashboard row is the only path.
   - Everything else unchanged.
4. Tests: expected **189/189 PASS**.

If green I'll proceed to FUI-4b (DashboardPage redesign to §15 S-03).

---

## 2026-04-19 — FUI-3: Shell (Sidebar + TitleBar + NavItem)

**From:** CTS (Claude Code)
**Why:** Third of five phases. Adds the application shell — the 32px draggable title bar strip and the 220/48px collapsible acrylic sidebar — that every post-onboarding screen renders inside. Onboarding still renders full-viewport per doc §15 S-02 ("Full-window, no sidebar").

### What landed

**Shell components** — `src/renderer/components/shell/`:
- `Shell.tsx` — composes `TitleBar` + `Sidebar` + scrollable content area on a mica-tinted root.
- `TitleBar.tsx` — 32px strip with Fluent shield icon + "Vision-EviDex" title. Draggable (`-webkit-app-region: drag`) except icon/title region (which is no-drag). Reserves 140px on the right for the OS caption buttons that `titleBarOverlay` renders.
- `Sidebar.tsx` — six nav destinations in doc §5.6 order (Dashboard, Sessions, Templates, Reports, Audit Pack, Settings-in-footer). Dashboard and Settings are live; the four middle destinations render **disabled** with tertiary text until their screens land in Wk6 / Phase 2+. Collapse toggle at the top (Menu icon); 220px expanded, 48px collapsed, `sidebarCollapse` animation via CSS transition on `width`.
- `NavItem.tsx` — single nav row with icon + label, active state (3px accent left bar via `::before` + accent-tinted background + accent text), hover / pressed / disabled states. `aria-current="page"` on active. Collapsed mode hides the label and uses `title={label}` for OS tooltip.
- `index.ts` barrel.

**Icons** — imported from `@fluentui/react-icons` (version `^2.0.226`, already present):
`DataBarVerticalRegular`, `ImageMultipleRegular`, `DocumentBulletListRegular`, `DocumentTextRegular`, `ShieldCheckmarkRegular`, `SettingsRegular`, `NavigationRegular`, `ShieldCheckmarkFilled` (title-bar icon).

**CSS** — appended to `src/renderer/styles/components.css`:
- `.shell-root` / `.shell-main` / `.shell-content` layout
- `.title-bar` / `.title-bar-icon` / `.title-bar-title` with drag regions + OS-caption reserve
- `.nav-sidebar` (220px default, `.collapsed` → 48px) with acrylic material + backdrop-filter + border-right divider
- `.nav-item` with active / hover / pressed / disabled / collapsed states + 3px accent bar
- `.nav-sidebar-toggle` for the top collapse button, `.nav-sidebar-spacer` between main + footer groups

**Store** — `src/renderer/stores/nav-store.ts` expanded with `sidebarCollapsed: boolean` + `toggleSidebar()` + `setSidebarCollapsed()`. Still only two pages: `'dashboard' | 'settings'`.

**App.tsx** — Onboarding still rendered full-viewport (unchanged). Dashboard and AppSettings now render inside `<Shell>`.

### Deliberate non-change (FUI-4 will fix)

- `DashboardPage` and `AppSettingsPage` keep their existing `min-h-screen bg-surface-primary p-6 md:p-10` outer wrappers for now. The Shell's `.shell-content` therefore has **no inherent padding** — the pages own their own. FUI-4 screen ports move page-level padding into the shell per doc §4.5 (24px all sides).
- Dashboard still renders its own "Settings" button next to the nav pill; AppSettings still has its "← Dashboard" back link. These are redundant with the Sidebar but harmless; both paths converge on the same `goTo()`. FUI-4 cleanup removes the in-page buttons.

### Verification ask

1. `git pull`
2. `npm run report` — expected **PASS 189/189**. Most at-risk: the `@fluentui/react-icons` imports in `Sidebar.tsx` + `TitleBar.tsx` (seven icon names). If any name doesn't resolve in 2.0.324, paste the exact error — Fluent icons occasionally rename between minor versions even though we pinned 2.0.226 minimum.
3. `npm run dev` — expected sequence:
   - **Onboarding route unchanged** (still full-viewport wizard; if `settings.json` has `onboardingComplete=false` — e.g. first run on a clean userData dir).
   - **Dashboard route shows the Shell**: 32px title bar at top, 220px acrylic sidebar on the left with six rows (Dashboard active with accent bar + text; Sessions/Templates/Reports/Audit Pack greyed out; Settings at the bottom). Dashboard content renders in the remaining area exactly as before (same metric cards, quick links, recent projects).
   - **Clicking the Settings nav row** switches the content to AppSettingsPage — shell persists; title bar + sidebar remain.
   - **Clicking the Menu toggle** at the top of the sidebar collapses to 48px (labels hide; icons remain). Click again to expand.
   - **Clicking a disabled nav row** (Sessions/Templates/Reports/Audit Pack) does nothing — the button is `disabled`; hover is flat; collapsed-mode tooltip shows the label.
   - Title bar is drag-region across the icon + title area. The OS caption buttons (close/min/max) still occupy the right 140px and respond as normal.
4. Tests: **189/189 PASS** (unchanged — no existing spec imports from the shell).

Known cosmetic (not to fix in FUI-3):
- The Dashboard + AppSettings pages look slightly oversized because their `min-h-screen` runs past the shell's visible area by ~32px (the title bar height). Triggers a single screen-scroll. FUI-4 fixes by moving padding into Shell and removing page-level `min-h-screen`.
- Dashboard header shows a redundant "Settings" button next to the Sidebar's Settings row. FUI-4 removes it.

If all green I'll start FUI-4 (port OnboardingPage, DashboardPage, AppSettingsPage to doc §15 specs).

---

## 2026-04-19 — FUI-2: Fluent UI component library (primitives only)

**From:** CTS (Claude Code)
**Why:** Second of five Fluent phases. FUI-2 ships the `src/renderer/components/ui/` primitive library — the reusable React components every screen will consume from FUI-4 onwards. **No screen is modified.** The three existing D25 screens still import from the deprecated-alias layer and render byte-identically to `4724b26`.

### What landed

**Styles** — `src/renderer/styles/components.css` (NEW, imported from `global.css` right after `loading.css`):
- `.btn-base` + `.btn-accent` / `.btn-standard` / `.btn-subtle` / `.btn-outline` + `.btn-compact` modifier (§5.1)
- `.input` + `.input-multiline` with focus/hover/invalid states (§5.2)
- `.toggle-track` / `.toggle-thumb` with checked/press thumb-stretch micro-interaction (§5.3)
- `.checkbox` / `.radio` with thin SVG-check / inner-dot pseudo-elements (§5.4)
- `.dropdown` with embedded SVG chevron (§5.5)
- `.card` / `.card-elevated` / `.card-highlighted` + `.card-divider` (§5.7)
- `.modal-backdrop` / `.modal` + `.modal-title` / `.modal-body` / `.modal-actions` (§5.8)
- `.status-badge` with per-tag dot + bg colour (§5.10)
- `.toast` with severity-coded left border (§5.12)
- `.sr-only` visually-hidden helper for live regions

**React primitives** — `src/renderer/components/ui/`:

| Component | File | Notes |
|---|---|---|
| `Button` | `Button.tsx` | `variant`: accent/standard/subtle/outline; `size`: normal/compact; `startIcon`/`endIcon` slots; `forwardRef`. |
| `Input` / `Textarea` | `Input.tsx` | `invalid` prop → `aria-invalid='true'` + red bottom border. |
| `Toggle` | `Toggle.tsx` | `<label>` wraps a visually-hidden `<input type=checkbox role=switch>`; stretch animation comes from CSS `:active`. |
| `Checkbox` / `Radio` | `Checkbox.tsx` / `Radio.tsx` | Same pattern — native input hidden inside a styled label. |
| `Dropdown` | `Dropdown.tsx` | Native `<select>` styled to match input + Fluent chevron SVG data-URI; `options: DropdownOption[]` + optional `placeholder`. |
| `Card` | `Card.tsx` | `variant`: default/elevated/highlighted; exports `CardDivider`. |
| `Modal` | `Modal.tsx` | Framer Motion `dialogEnter` + smoke backdrop `fadeIn`; ESC closes when `onClose` provided; autofocuses the dialog; exports `ModalTitle` / `ModalBody` / `ModalActions`. |
| `Toast` | `Toast.tsx` | Severity pill (success/error/warning/info) with optional icon + dismiss button; wrapped in `toastEnter` variant. |
| `StatusBadge` | `StatusBadge.tsx` | `tag: 'pass' \| 'fail' \| 'blocked' \| 'skip' \| 'untagged' \| 'suspect'` + optional custom label. |
| `ProgressBar` | `ProgressBar.tsx` | `value` omitted → indeterminate; present → determinate; `status` colours the determinate fill. |
| `ProgressRing` | `ProgressRing.tsx` | Three permitted sizes: 16 / 20 / 32. Always inline with an optional label. |
| `Skeleton` | `ui/Skeleton.tsx` | Fluent shimmer (1.5s sweep) replacing the old `animate-pulse`. |

**Barrel** — `src/renderer/components/ui/index.ts` re-exports everything for clean screen-side imports like `import { Button, Card, Modal } from '../components/ui'`.

**Backwards-compat** — `src/renderer/components/Skeleton.tsx` is rewritten to delegate to the new `ui/Skeleton`. Same API (`Skeleton({className, style})` + `BootSkeleton()`), same callers keep working. The old pulse animation is now the new shimmer — the only visual change anywhere in FUI-2.

### What did NOT change

- No screen file (`OnboardingPage`, `DashboardPage`, `AppSettingsPage`, 8 step components) was touched.
- No existing test was touched — still 189 specs.
- No new IPC / no schema migration.
- The three Phase-2 stubs (toolbar / annotation / region) are untouched.

### Verification ask

1. `git pull`
2. `npm run report` — expected **PASS**. Most at-risk: the barrel re-exports in `ui/index.ts` (stray `type` re-exports under `verbatimModuleSyntax: false` should be fine, but if any fails paste the exact error). Also the Framer Motion wiring in `Modal.tsx` / `Toast.tsx` (new imports — `framer-motion` is already a dep so install should be clean).
3. `npm run dev`:
   - Wizard should render **exactly** as on `4724b26`. No visual regression.
   - **Only visible difference**: boot skeleton + any other skeleton instances now sweep left-to-right (Fluent shimmer) instead of fading (old pulse). Subtle — worth looking at when the wizard is about to appear.
4. Tests: expected unchanged at **189/189 PASS**.

If all green, I'll start FUI-3 (Shell: Sidebar + TitleBar + NavItem — the 220/48px acrylic sidebar and the content-area React title bar that overlays the OS titlebar strip).

---

## 2026-04-19 — FUI-1: Fluent design foundation (tokens + materials + theme plumbing)

**From:** CTS (Claude Code)
**Why:** First of five phases porting the renderer to the Fluent UI design system specified in `Docs MD/07-VisionEviDex-FluentUI-DesignSystem-v1_0.md`. FUI-1 is **foundation only** — no component or screen is ported yet. Every pre-Fluent token has a deprecated alias so the three existing D25 screens (OnboardingPage, DashboardPage, AppSettingsPage) keep rendering byte-identically to `57d6814`.

### What landed in this push

**Design tokens (§2 of doc)**
- `src/renderer/styles/tokens.css` — complete Fluent token set: layers 0–4, fills subtle/secondary/tertiary/quaternary/accent/success/warning/danger, strokes default/surface/focus/divider/card-top/control, text primary/secondary/tertiary/disabled/on-accent/accent/success/warning/danger/inverse, accent scale (Windows Blue `#0078D4` default, runtime-overridable), status pass/fail/blocked/skip/untagged/suspect, elevation shadows 2/3/card, radii control(4)/card(8)/overlay(8)/dialog(8)/pill/circle, type scale (caption through display), spacing 1–12, motion durations 83/167/250 with three easings, icon sizes xs–xl, skeleton highlight.
- Dark theme block (`[data-theme='dark']`) with recalibrated accent (`#60CDFF`) per doc §2.3.
- `[data-density='compact']` + `[data-font-size='large']` variant blocks.
- `prefers-reduced-motion` zeroes all motion durations.
- `forced-colors: active` maps tokens to `Canvas` / `CanvasText` / `Highlight` per doc §2.6.
- **Deprecated alias layer** — every pre-Fluent token (`--surface-*`, `--text-*`, `--border-default`, `--color-accent`, `--color-pass`, `--radius-sm/md/lg`, `--shadow-neumorphic-*`, `--glass-blur*`, `--transition-*`, `--font-sans`) resolves to its Fluent equivalent with a `/* DEPRECATED — remove in FUI-5 */` marker on the same line. Grep `DEPRECATED` in FUI-5 to delete.

**Materials (§3)**
- `src/renderer/styles/materials.css` — new. `.material-acrylic`, `.material-acrylic-thick`, `.material-mica`, `.elevation-flyout/modal/card`, `.interactive-rest/hover/pressed/selected`, `:focus-visible` ring.

**Loading (§13)**
- `src/renderer/styles/loading.css` — new. `fluent-shimmer` 1.5s left-to-right sweep for `.skeleton`, `fluent-bar-slide` for indeterminate progress, determinate progress with warning/danger/success colour swaps, `fluent-ring-rotate`/`fluent-ring-arc` for progress ring, reduced-motion overrides.

**Global styles + tailwind (§10.3, §10.4)**
- `src/renderer/styles/global.css` — `@import` order is `tokens → materials → loading → tailwind`. Body font is `Segoe UI Variable Text`, heading font is `Segoe UI Variable Display`. Segoe UI Variable is a Windows system font; no bundling needed.
- `tailwind.config.js` — `darkMode: false` (the `dark:` prefix is banned by doc §10.3); Tailwind now only owns spacing (1–12 mapped to 4–48px), radius (control/card/overlay/dialog), and font-family. Colour classes remain as deprecated aliases that resolve to Fluent tokens.

**Main-process plumbing (§2.4, §8.1, §8.2, §9.3)**
- `src/main/services/theme.service.ts` — new. `getSystemAccent()` reads `systemPreferences.getAccentColor()` on Windows (falls back to `#0078D4` elsewhere), `bindThemeBroadcasts()` installs a `nativeTheme.on('updated')` listener that broadcasts `theme:accentColourUpdate` + `theme:systemThemeChange` to every window.
- `src/main/window-manager.ts` — main window now uses `titleBarStyle: 'hidden'` with a theme-aware `titleBarOverlay`, `backgroundColor: '#00000000'`, and `setBackgroundMaterial('mica')` on Windows (try-wrapped; Windows 10 no-ops gracefully).
- `src/main/app.ts` — calls `bindThemeBroadcasts()` before `createMainWindow()` and pushes the initial accent + system theme once `did-finish-load` fires.
- `src/shared/ipc-channels.ts` — `IPC_EVENTS.THEME_ACCENT_COLOUR_UPDATE` and `THEME_SYSTEM_CHANGE`.
- `src/preload/preload.ts` — `window.evidexAPI.events.onAccentColourUpdate()` and `onSystemThemeChange()` bridge.

**Renderer plumbing (§9.1, §9.2, §7.3, §7.4)**
- `src/renderer/providers/ThemeProvider.tsx` — new. Reads persisted theme on mount, resolves `'system'` to actual `light`/`dark`, subscribes to accent + system-theme broadcasts, applies `data-theme` / `data-density` / `data-font-size` to document root, exposes `useThemeContext()` for components that need the resolved accent.
- `src/renderer/lib/accent-scale.ts` — new. Computes light-1/2/3 and dark-1/2/3 stops from a base accent and writes `--accent-r/g/b` for rgba() composition.
- `src/renderer/hooks/useReducedMotion.ts` — new. Reflects `prefers-reduced-motion: reduce` live.
- `src/renderer/components/animations.ts` — new. All ten Fluent motion variants: `fadeIn`, `dialogEnter`, `flyoutEnter`, `toastEnter`, `pageForward`, `pageBack`, `captureFlash`, `sidebarCollapse`, `navLabelFade`, `counterBump`.
- `src/renderer/App.tsx` — wraps shell in `<ThemeProvider>`.
- `src/renderer/pages/AppSettingsPage.tsx::AppearanceTab` — removed the direct `document.documentElement.dataset.theme = settings.theme` write (ThemeProvider now owns that attribute). Theme change in settings requires a page reload until FUI-4 adds a settings-updated broadcast.

**Dependency**
- `package.json` — `@fluentui/react-icons: ^2.0.226` added to `dependencies`. Version pinned to ^2.0.226 per your note about icon renames between minor versions.

### What did NOT change

- No component rewrites — `Skeleton`, `OnboardingPage`, `DashboardPage`, `AppSettingsPage`, all 8 step components, and the 3 Phase-2 stubs (toolbar/annotation/region) are untouched.
- No test changes — the existing 189 tests still assert against types and pure logic, not against Tailwind class names.
- No breaking change to IPC contracts — two new push events, no request/response shapes modified.
- No schema migration — `Settings.theme` is still `'light' | 'dark' | 'system'`.

### Verification ask — this has to PASS before FUI-2 starts

1. `git pull`
2. `npm install` — picks up `@fluentui/react-icons@^2.0.226`.
3. `npm run report` — expected:
   - typecheck: **PASS**. Most at-risk files: `src/main/window-manager.ts` (new `nativeTheme` imports, `titleBarStyle/Overlay` options, `setBackgroundMaterial`), `src/main/services/theme.service.ts` (new), `src/renderer/providers/ThemeProvider.tsx` (new). If anything fails, paste the error verbatim.
   - tests: **PASS 189/189** (unchanged — no tests touched).
   - PBKDF2 + audit: unchanged.
4. `npm run dev`:
   - Wizard should render exactly as before (same 7 steps, same buttons, same skeleton splash) — tokens are aliased.
   - **New**: on Windows 11, the main window should have the Mica tint on its background (subtle wallpaper-tinted fill under the content area). On Windows 10 you get a solid `#F3F3F3` fallback — that's expected, not a bug.
   - **New**: the title bar should be a 32px blank strip with the close/minimise/maximise buttons at the right and no text on the left (React-rendered title bar content lands in FUI-3 Shell). The strip colour should match the theme (`#F3F3F3` light / `#202020` dark) and flip if you toggle Windows's light/dark preference in Settings → Personalisation while the app is running.
   - **New**: in a renderer DevTools console, `getComputedStyle(document.documentElement).getPropertyValue('--color-accent-default')` should return your Windows system accent colour (e.g. `#0078D4` default, but whatever the user has set in Settings → Personalisation → Colours). If it does, the `systemPreferences.getAccentColor()` → IPC → `applyAccentScale()` chain works end-to-end.

### If anything above fails

Paste the exact error / observation into `INBOX-TO-CTS.md`. Do not start FUI-2 work locally — the foundation must be on a green run report first.

---

## 2026-04-18 — Cleanup pass (pre UI-redesign)

**From:** CTS (Claude Code)
**Why:** User is bringing a new UI design system. Before rebuilding the renderer I'm (a) reverting the Playwright e2e suite and (b) removing stub files + stale temporal comments that will either be deleted-and-recreated under the new design system, or rot further as the codebase evolves.

### Reverted (Playwright e2e)

- Deleted `e2e/` directory (6 files) and `playwright.config.ts`.
- Removed `@playwright/test` from `package.json` devDependencies.
- Removed `pretest:e2e`, `test:e2e`, `test:e2e:update-snapshots`, `test:e2e:install` npm scripts.
- Removed `playwright.config.ts` from `tsconfig.node.json` include.
- Removed Playwright patterns from `.gitignore`.
- Removed `EVIDEX_APPDATA_ROOT` env-var override from `src/main/app-paths.ts` (it was test-only).

### Deleted (unreferenced stubs — 26 files)

- 19 renderer page stubs in `src/renderer/pages/`: AuditPack, BrandingProfile, CreateProject, KeyboardShortcuts, LicenceActivation, MetricsImport, ProjectList, ProjectOverview, ProjectSettings, ReportBuilder, SessionDetail, SessionGallery, SessionIntake, SessionList, SignOff, StatusReports, TemplateBuilder, TemplateLibrary, TsrBuilder. All were 12-line `export function XxxPage()` placeholders, none imported anywhere. They will be recreated under the new design system as each feature actually lands.
- 7 service stubs in `src/main/services/`: signoff, tray, shortcut, export, session, capture, metrics-import. Each was a class where every method threw `Error('XxxService.foo — Phase N')`. Not imported by anything except the barrel `index.ts`. Same rationale — rebuilt when the owning phase actually starts.
- `services/index.ts` pruned to the seven services that actually exist.
- `DatabaseService` lost six `throw new Error(...)` stub methods (`getTemplates`, `getTemplate`, `saveTemplate`, `deleteTemplate`, `deleteBrandingProfile`, `upsertMetricsData`, `getMetricsData`). They'll be reintroduced as real prepared-statement implementations when the feature arrives.

### Stripped (stale comments)

Removed temporal phase-dating comments that describe *when something landed* or *when something will land* (e.g. "Phase 1 Wk5 D23:", "lands in Wk6", "D20 will route to…", "Week 5 adds…"). These rot within a sprint and make the code read like a diary instead of a spec. Kept comments that describe a constraint, invariant, or non-obvious behaviour (architectural rules, security notes, Risk R-07 references).

### Kept (real fixes from the blank-screen epic)

- URL correction in `window-manager.loadRendererEntry` — all four entries now at `src/<dir>/index.html`.
- CSP split into `DEV_CSP` + `PROD_CSP` selected via `app.isPackaged`.
- The `did-fail-load` listener (single line, operational, not debug).
- `Skeleton` + `BootSkeleton` components and their wiring in App / Dashboard / AppSettings.

### Verification ask

Standard cadence:

1. `git pull`
2. `npm install` — `@playwright/test` is being removed; `npm install` should just prune its tree.
3. `npm run report` — expected PASS. Watch for: 
   - typecheck PASS (most at-risk — the `database.service.ts` import list shrunk and method stubs were removed).
   - tests PASS, **expected count unchanged at 189** — no tests touched the deleted pages or stub services.
4. `npm run dev` — expected: wizard renders exactly as on `373992d`. No visual change at all.

If typecheck fails, please paste the exact TS errors into `INBOX-TO-CTS.md`. If tests fall below 189, paste the failing spec name + expected vs received.

---

## 2026-04-18 — Cleanup + Playwright e2e suite (resolves blank-screen epic)

**From:** CTS (Claude Code)
**Summary:** User confirmed the UI renders after `b62ac0d`. The real fixes were the renderer URL correction (`3a62e86`) and the dev CSP split (`b62ac0d`). This commit strips the diagnostic scaffolding that was added to triage the blank screen, and lands a Playwright end-to-end test suite so no future UI regression reaches a push undetected.

### Cleanup — kept vs reverted

- **Kept (real fixes):**
  - `window-manager.ts::loadRendererEntry` — unified path to `src/<dir>/index.html` for all four entries (dev + prod).
  - `window-config.ts` — `DEV_CSP` / `PROD_CSP` split, `app.isPackaged` selects.
  - `window-manager.ts` — one `did-fail-load` listener at error level (useful operationally, not debug noise).
  - `Skeleton` component + `BootSkeleton` + wiring in App/Dashboard/AppSettings.
- **Reverted (debug-only):**
  - Auto-open DevTools on `dom-ready` in non-packaged.
  - Verbose `render-process-gone`, `preload-error`, `renderer.console` forwarders.
  - Visible HTML fallback text inside `#root` in `src/renderer/index.html`.

### Playwright e2e suite

Five spec files, 19 tests, running against the **built** main-process entry (`out/main/app.js`) with an isolated tmp `userData` dir per test (honored by new `EVIDEX_APPDATA_ROOT` env var in `src/main/app-paths.ts`).

- `e2e/fixtures.ts` — base test fixture: launches Electron, mints a tmp userData dir, exposes `seedSettings()` for pre-onboarded scenarios.
- `e2e/app-boot.spec.ts` — window mounts, title correct, preload bridge exposed, `settings:get` round-trip, zero renderer console errors.
- `e2e/onboarding.spec.ts` — Step 1/7 visible, Next/Back navigation, profile-step validation gating (Next disabled until name + role filled), Skip visible on optional steps only.
- `e2e/dashboard-settings.spec.ts` — post-onboarding dashboard renders 4 metric cards + empty-state copy + Settings button nav; AppSettingsPage shows 6 tabs (Licence → "About" in `none` mode), tab clicks don't throw.
- `e2e/theme-appearance.spec.ts` — `data-theme` attribute reflects settings.theme, light/dark radios toggle it, CSS variables resolve to concrete colour / px values, skeleton animation visible on boot.
- `e2e/visual.spec.ts` — screenshot baselines for onboarding Step 1 / dashboard empty / settings-appearance dark. Baselines must be **regenerated on Asus** (the canonical render machine) via `npm run test:e2e:update-snapshots`.

### One-time Asus setup

1. `git pull`
2. `npm install` — adds `@playwright/test@^1.48.0`.
3. `npx playwright install chromium` (one-time per machine; Playwright needs its own browser binary even though we're driving Electron — this is how Playwright's tracing/snapshot tooling works).
4. Verify: `npm run typecheck` + `npm test` still PASS (no existing tests touched).

### First e2e run

1. `npm run build` — Playwright's `pretest:e2e` already runs this, but the first run on a new machine is faster if you kick the build manually.
2. `npm run test:e2e` — should show 19 tests, visual tests will FAIL the first time (no baseline snapshots exist yet).
3. `npm run test:e2e:update-snapshots` — generate baselines on Asus. Commit the `e2e/*-snapshots/` directory back.
4. Future runs: `npm run test:e2e` — expect PASS 19/19.

### Cadence integration

- Not yet wired into `npm run report` as a gating precheck. Once you've confirmed e2e runs green on Asus once, I'll extend `scripts/run-report.js` to call it. Keeping them decoupled today so the first run can fail visibly without blocking the existing report pipeline.

### Expected failures on first run

- **Visual specs** — no baselines exist yet. Run the update command above.
- **Any spec referencing `out/main/app.js` not built** — the `pretest:e2e` hook handles this, but if it skips for any reason the fixture throws a clear error message.

No action required beyond the setup + first run + snapshot commit. If any non-visual spec fails, paste the Playwright output into `INBOX-TO-CTS.md` and I'll fix from CTS.

---

## 2026-04-18 — URGENT #2: renderer diagnostics (blank screen still after 3a62e86)

**From:** CTS (Claude Code)
**Why:** `3a62e86` corrected the renderer URL but the window is still blank. Previous Asus verifications in `INBOX-TO-CTS.md` have only captured main-process terminal logs — those prove the BrowserWindow opened, not that the renderer mounted. I need actual renderer-side diagnostics this time.

### Changes in this commit

1. `src/renderer/index.html` — `#root` now ships with visible **fallback text** ("Vision-EviDex — static HTML loaded, awaiting renderer JS…"). React replaces this when it mounts. If the window shows this text, HTML reached the window but JS didn't mount. If the window is still totally blank, the HTML itself isn't loading.
2. `src/main/window-config.ts` — CSP was `connect-src 'none'` + `script-src 'self'`, which blocks Vite's HMR WebSocket and possibly its inline HMR runtime. Split into `PROD_CSP` (the original strict one) and `DEV_CSP` (allows `ws:`, `http://localhost:*`, `'unsafe-inline'`, `'unsafe-eval'` — all needed for vite dev). `CSP_HEADER` picks via `app.isPackaged`.
3. `src/main/window-manager.ts` — auto-opens DevTools on the side panel in dev mode; forwards renderer `console-message` into the main logger (so terminal + log file capture renderer errors); logs `did-fail-load`, `render-process-gone`, `preload-error`.

### Verification ask — please capture all of this

1. `git pull`
2. `npm run report` (expected PASS; no tests touched)
3. `npm run dev`
4. Observe the window. One of three outcomes:
   - **A: wizard renders** — great, paste a one-line "wizard visible" confirmation.
   - **B: fallback text visible** ("Vision-EviDex — static HTML loaded…") — HTML loaded, JS didn't mount. Copy the renderer DevTools **Console** tab (should auto-open on the right) into inbox, plus the **Network** tab showing failed requests.
   - **C: totally blank white window** — HTML didn't load. Paste the main-process terminal output verbatim — the new `window.load` line (logs the URL), plus any `window.did-fail-load` / `window.preload-error` / `window.render-process-gone` lines from the logger.
5. Also grep for `renderer.console` lines in the terminal output — those are renderer errors forwarded from the window. Paste anything tagged `level: "error"` or `level: "warning"`.

This is a data-gathering pass, not a code-fix pass. Please don't "fix" errors locally — just surface them so CTS can diagnose from CTS. If the wizard works (outcome A), mark this entry `[RESOLVED]` and we move on.

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
