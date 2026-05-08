# Vision-EviDex — Final Pre-Week-9 Codebase Analysis
**Generated: 2026-05-08 | Full codebase read post Batch-A gap fixes**
**Gate basis: `7975bb9` — 347/347 PASS, typecheck PASS**

This document replaces EVIDEX-GAP-ANALYSIS-PRE-W9.md as the definitive pre-W9 state record.
Items are categorised: BLOCK (must fix before W9), RISK (will cause a W9 bug if not fixed),
DEBT (safe to defer but noted), DONE (previously identified, now confirmed fixed).

---

## PART 1 — CONFIRMED FIXED (do not re-raise)

All items from EVIDEX-GAP-ANALYSIS-PRE-W9.md Batch A and B are confirmed in files:

| ID | Fix confirmed |
|---|---|
| GAP-T1 | `CaptureResult.statusTag: StatusTag` — required, present in entities.ts + returned from capture.service.ts |
| GAP-T2 | `RecentProject.clientName` — entity + DB schema (ALTER TABLE) + project.service both upserts + type casts removed |
| GAP-T3 | `mapProject` recovers `brandingProfileId` from snapshot; `ProjectService.get()` injects `storagePath` |
| GAP-P1 | `preload.ts` `project.create` typed as `ProjectCreateInput` |
| GAP-S1 | `onCaptureArrived` subscription inside `startSession`/`clearSession` lifecycle; module-level block removed |
| GAP-S2 | `goBack()` TODO PH2-ROUTING comment present |
| GAP-U1 | `SessionIntakePage` withholds modal until settings resolve |
| GAP-U2 | `ThemeProvider.tsx` JSDoc updated |
| GAP-U3 | `ToastProvider.tsx` created and wired in `App.tsx` |
| GAP-R2 | `ipc-router.ts` log string cleaned |
| GAP-D1 | `CLAUDE.md §8` test count updated to 347/26 |
| GAP-D2 | `CLAUDE.md §8a` comms note updated |

All deferred items (GAP-T4, GAP-P2, GAP-R1, GAP-S3, GAP-M2, GAP-M3) correctly remain in BACKLOG.

---

## PART 2 — NEW GAPS FOUND IN THIS ANALYSIS

---

### NEW-1 🔴 BLOCK — `SessionGalleryPage.tsx` `derivedCounts()` always returns 0/0/0 for pass/fail/blocked

```ts
// SessionGalleryPage.tsx ~line 230
function derivedCounts(captures: CaptureResult[]): {
  captureCount: number; passCount: number; failCount: number; blockedCount: number;
} {
  // CaptureResult itself doesn't carry statusTag — the DB Capture row does.
  // Until project-DB read flows in Wk 8, derive what we can: total only.
  return {
    captureCount: captures.length,
    passCount: 0,
    failCount: 0,
    blockedCount: 0,
  };
}
```

`CaptureResult` NOW has `statusTag` (GAP-T1 fixed it). But `derivedCounts` still returns
hardcoded 0/0/0 for pass/fail/blocked. The summary bar StatusBadge components show
"0 pass · 0 fail · 0 blocked" for every active session, even after the user tags captures.

**Fix:**
```ts
function derivedCounts(captures: CaptureResult[]): {
  captureCount: number; passCount: number; failCount: number; blockedCount: number;
} {
  return {
    captureCount: captures.length,
    passCount:    captures.filter((c) => c.statusTag === 'pass').length,
    failCount:    captures.filter((c) => c.statusTag === 'fail').length,
    blockedCount: captures.filter((c) => c.statusTag === 'blocked').length,
  };
}
```

---

### NEW-2 🔴 BLOCK — `CaptureThumbnail.tsx` reads `statusTag` from the `statusTag` prop, not from `capture.statusTag`

```ts
// CaptureThumbnail.tsx
export interface CaptureThumbnailProps {
  capture:    CaptureResult;
  statusTag?: StatusTag;   // ← separate optional prop, defaults to 'untagged'
  ...
}

export function CaptureThumbnail({
  capture,
  statusTag = 'untagged',  // ← defaults to 'untagged' regardless of capture.statusTag
  ...
```

The component renders `<StatusBadge tag={statusTag} />` using the PROP, not `capture.statusTag`.
Every caller in `SessionGalleryPage` (`ThumbnailGrid`) passes only `capture={c}` with no `statusTag`
prop. So the badge always shows "Untagged" even after the user tags a capture and the optimistic
update sets `capture.statusTag = 'pass'`.

**Fix:** Remove the separate `statusTag` prop, derive from `capture.statusTag`:
```ts
export interface CaptureThumbnailProps {
  capture:       CaptureResult;
  // statusTag prop removed — use capture.statusTag directly
  isSelected?:   boolean;
  sequenceNum?:  number;
  onClick?:      (captureId: string) => void;
  onShiftClick?: (captureId: string) => void;
}

export function CaptureThumbnail({
  capture,
  isSelected = false,
  sequenceNum,
  onClick,
  onShiftClick,
}: CaptureThumbnailProps): JSX.Element {
  ...
  aria-label={`Capture ${sequenceNum ?? capture.captureId} — ${capture.statusTag}`}
  ...
  <StatusBadge tag={capture.statusTag as StatusTagKind} />
}
```

---

### NEW-3 🔴 BLOCK — `SessionGalleryPage.tsx` stale comment claims CaptureResult has no statusTag

```ts
// SessionGalleryPage.tsx line ~232
// CaptureResult itself doesn't carry statusTag — the DB Capture row does.
// Until project-DB read flows in Wk 8, derive what we can: total only.
```

This is now wrong. `CaptureResult.statusTag` exists (GAP-T1). The comment actively
misleads future development. Must be updated alongside NEW-1.

---

### NEW-4 🟠 RISK — `DashboardPage.tsx` "View all" link is a dead anchor

```tsx
<a
  href="#view-all"
  onClick={(e) => e.preventDefault()}
  style={{ ... }}
>
  View all
</a>
```

This prevents default but navigates nowhere. It should navigate to `project-list`
or be removed if `ProjectListPage` is already the home page and "view all" is redundant.

**Fix:**
```tsx
<button
  type="button"
  className="btn-link"
  onClick={() => navigate('project-list')}
  style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-accent-default)' }}
>
  View all
</button>
```

---

### NEW-5 🟠 RISK — `ProjectListPage.tsx` `handleOpen` errors silently swallowed — user gets no feedback

```ts
async function handleOpen(project: RecentProject): Promise<void> {
  try {
    await openProject(project.filePath);
    navigate('session-intake', { projectId: project.projectId });
  } catch (err) {
    // Surface inline. Future: toast.
    console.error('openProject failed', err);  // ← error goes nowhere visible
  }
}
```

If a `.evidex` file is missing, corrupted, or was created on another machine, the
user clicks a project row and nothing happens — no error, no toast, no feedback.
`ToastProvider` is now wired. This is the first place to use it.

**Fix:**
```ts
import { useToast } from '../providers/ToastProvider';

const { showToast } = useToast();

async function handleOpen(project: RecentProject): Promise<void> {
  try {
    await openProject(project.filePath);
    navigate('session-intake', { projectId: project.projectId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    showToast('error', 'Could not open project', msg);
  }
}
```

Same issue exists in `DashboardPage.tsx` `handleOpen` — apply the same fix there.

---

### NEW-6 🟠 RISK — `CreateProjectPage.tsx` `onSubmit` errors surfaced inline but `handleOpen` callers have no toast

`CreateProjectPage` already renders `submitError` inline in the form. This is fine.
But if `createProject` succeeds and then `navigate('session-intake', ...)` fires before
`SessionIntakePage` has resolved its settings (GAP-U1 fixed), the `if (!settings) return`
guard shows a spinner. This is now correct.

However: after `createProject` succeeds, the project is stored in `activeProject` in the
store. If the user navigates back from the spinner to project-list before settings load,
`activeProject` is set but the `loadRecent` after `createProject` may not have completed
yet. The project list might be empty briefly. This is acceptable — it resolves in < 100ms.
No fix needed, documenting for awareness.

---

### NEW-7 🟠 RISK — `SessionGalleryPage.tsx` notes textarea is local state only — never persisted

```tsx
const [notes, setNotes] = useState('');
...
<Textarea
  placeholder="Notes"
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
  rows={3}
/>
```

Notes are typed but never saved. There is no call to update the capture notes via IPC.
`DatabaseService.updateCaptureNotes()` exists. `CaptureResult` does not carry `notes`
but `Capture` (DB entity) does. The user types a note, it disappears when they close
the detail panel or end the session.

**Decision required:** Either wire it (adds `window.evidexAPI.capture.updateNotes` to
the preload bridge + a new IPC handler) or remove the textarea for W9 and add it back
when `SessionDetailPage` lands with full capture editing. Removing it is cleaner than
shipping a fake-persistent field.

**Recommendation:** Remove the textarea from DetailPanel for now. Replace with a
"Notes editing available in Phase 2 Wk 9 SessionDetailPage" caption. Add the full
notes-editing surface to SessionDetailPage in W9.

---

### NEW-8 🟠 RISK — `ThemeStorageStep.tsx` sets `data-theme` on preview but never restores on unmount

```ts
// ThemeStorageStep.tsx
useEffect(() => {
  if (theme !== 'system') {
    document.documentElement.setAttribute('data-theme', theme);
  }
}, [theme]);
// ← no cleanup/restore on unmount
```

If the user selects 'dark' in the wizard then navigates Back to change something,
the app stays dark until the user either completes onboarding (ThemeProvider picks
up the saved preference) or hard-refreshes. Worse: if they select 'dark' then
abandon the wizard (close it without completing), the dark theme persists for
the whole session.

**Fix:**
```ts
useEffect(() => {
  const original = document.documentElement.getAttribute('data-theme');
  if (theme !== 'system') {
    document.documentElement.setAttribute('data-theme', theme);
  }
  return () => {
    // Restore to the pre-step value on unmount so an abandoned wizard
    // doesn't leave the wrong theme active.
    if (original) document.documentElement.setAttribute('data-theme', original);
    else document.documentElement.removeAttribute('data-theme');
  };
}, [theme]);
```

---

### NEW-9 🟡 DEBT — `project.store.ts` `openProject` sets `activeProject` from `result.data.project` but `SessionGalleryPage` reads `activeSession` from `session.store` — the two are not kept in sync

```ts
// project.store.ts openProject
set({ activeProject: result.data.project });
```

```ts
// SessionGalleryPage
const activeSession = useSessionStore((s) => s.activeSession);
```

When a user opens a project and goes to session-intake then starts a session, both
stores are set correctly. But if the app restarts mid-session (Phase 4 recovery),
`activeProject` would be null (no persistence) while the session row exists in the DB.
`SessionGalleryPage` relies on `useSessionStore.activeSession` being set from the
in-memory `startSession` call. If the gallery is navigated to directly (via the
nav-store's `currentSessionId`), it calls `window.evidexAPI.session.get(sessionId)`
to hydrate from the DB — that path is correct. Not a current bug, just noting the
asymmetry. Document in BACKLOG.

---

### NEW-10 🟡 DEBT — `CaptureThumbnail.tsx` `statusTag` prop still accepted from callers even after NEW-2 fix

After removing the `statusTag` prop in NEW-2, any caller that passes `statusTag`
explicitly will get a TypeScript error. Check: `ThumbnailGrid` in
`SessionGalleryPage` currently passes no `statusTag` prop — so there is no existing
caller that needs updating. Clean removal is safe.

---

### NEW-11 🟡 DEBT — `AppSettingsPage.tsx` loading skeleton renders outside `motion.div`

```tsx
// AppSettingsPage.tsx — when settings === null
if (settings === null) {
  return (
    <div className="shell-content-column" style={{ ... }}>  // ← plain div, no motion
      <FluentSkeleton ... />
```

When settings are null (first render), the loading state is a plain `div` with no
entry animation. Once settings load the real page animates in with `pageForward`.
The flash from skeleton → animated content is slightly jarring. Minor — wrap the
skeleton `div` in a `motion.div variants={fadeIn}` instead.

---

### NEW-12 🟡 DEBT — `DashboardPage.tsx` error display inconsistency

```tsx
// DashboardPage — only metrics error is shown
const [error, setError] = useState<string | null>(null);
...
{error && (
  <div role="alert" style={{ border: '1px solid var(--color-text-danger)', ... }}>
    Failed to load dashboard: {error}
  </div>
)}
```

`loadRecent` failures are silently ignored (`console.warn` in project.store). Metrics
failures show an alert. These should both use `showToast('error', ...)` now that
ToastProvider is wired. The inline error `div` and the `error` state can be removed,
replaced with a single `showToast` call on failure.

---

### NEW-13 🟡 DEBT — `SessionIntakePage.tsx` no loading state for the brief case where `projectId` is set but `activeProject` is null

```ts
const projectName = activeProject?.name ?? 'Active Project';
```

`'Active Project'` fallback is shown if the project store hasn't resolved yet. In
practice this never happens because `openProject` sets `activeProject` before
navigating to `session-intake`. But the fallback string shows in the modal title
which looks wrong. A stricter guard would be:

```ts
if (!activeProject) return (
  <div ...><ProgressRing size={20} />Loading project…</div>
);
```

Minor. Acceptable as-is for W9.

---

### NEW-14 🟡 DEBT — `OnboardingPage.tsx` `persist-onboarding.ts` makes multiple IPC calls not batched

```ts
// persist-onboarding.ts (implied from flow)
await window.evidexAPI.settings.update({ ... });
await window.evidexAPI.branding.save({ ... });
await window.evidexAPI.template.save?.(... ); // if any
```

These are sequential IPC calls in `persistOnboarding`. They work correctly but fire
serially. For onboarding this is acceptable (one-time, user-facing delay is
imperceptible at < 200ms total). No fix needed, documenting.

---

### NEW-15 🟢 CLEANUP — `SessionGalleryPage.tsx` has a stale import of `useCallback`

The previous session removed `useCallback` from the import:
```ts
import { useEffect, useMemo, useState } from 'react';
```
This is already clean. ✓ No action needed.

---

### NEW-16 🟢 CLEANUP — `DashboardPage.tsx` `RecentProjectsSection` accepts `navigate` as a prop but `navigate` is also available from `useNavStore` inside the function

```tsx
// RecentProjectsSection receives navigate as prop
function RecentProjectsSection({
  recent,
  onOpen,
  navigate,
}: { ..., navigate: (page: Page, ...) => void }): JSX.Element {
```

This works but is inconsistent with how other components access `navigate`. Minor
coupling through props rather than the store hook. Acceptable for W9.

---

## PART 3 — W9 READINESS GAPS (things W9 pages will need that don't exist yet)

These are not bugs in existing code but missing infrastructure that Week 9
pages will need on day 1.

### W9-NEED-1 — `session.get` IPC returns `Session | null` — W9 must null-guard every call

`SessionDetailPage` and `SessionListPage` will call `window.evidexAPI.session.get()`.
The return type is `IpcResult<Session | null>`. Every call site must check both
`result.ok` AND `result.data !== null`. Document in the W9 brief so it's not forgotten.

### W9-NEED-2 — No `session.list` IPC handler exists for `SessionListPage`

`SessionListPage` needs to list all sessions for a project. Looking at the IPC router:
there is `session:create`, `session:end`, `session:get` — but NO `session:list`.
`DatabaseService.getSessionsForProject()` exists. But it is not exposed via IPC.

**Must add before W9:**
- `IPC.SESSION_LIST = 'session:list'` in `ipc-channels.ts`
- `SessionListSchema = z.object({ projectId: z.string() })` in `schemas.ts`
- Handler in `ipc-router.ts`: `services.session.getAll(input.projectId)`
- `window.evidexAPI.session.list(projectId)` in `preload.ts`

This is a 4-file change that must land before `SessionListPage` can be written.

### W9-NEED-3 — No `capture.list` IPC handler exists for `SessionDetailPage`

`SessionDetailPage` needs all captures for a session. `DatabaseService.getCapturesForSession()`
exists. But it is not exposed via IPC.

**Must add before W9:**
- `IPC.CAPTURE_LIST = 'capture:list'` in `ipc-channels.ts`
- `CaptureListSchema = z.object({ sessionId: z.string() })` in `schemas.ts`
- Handler in `ipc-router.ts`: `services.capture.getForSession(input.sessionId)` (new method on CaptureService)
- `window.evidexAPI.capture.list(sessionId)` in `preload.ts`
- `CaptureService.getForSession(sessionId)` — reads from `getDb()?.getCapturesForSession(sessionId) ?? []`

Note: The returned type will be `Capture[]` not `CaptureResult[]`. `Capture` is the
DB entity with all fields. `CaptureResult` is the live-capture lightweight type.
`SessionDetailPage` needs `Capture[]` — the full DB row with `notes`, `statusTag`,
`annotatedFilename`, etc.

### W9-NEED-4 — `Capture` entity doesn't have `thumbnail` — SessionDetailPage will need to generate it

`Capture` (the DB entity) stores `originalFilename` but no `thumbnail` field. Loading
captures for `SessionDetailPage` from the DB gives filenames only. To show thumbnails,
the page would need to either:
a) Load each image from the container and resize in the renderer (expensive, wrong process)
b) Add a `capture:thumbnail` IPC that extracts the image from the container and returns
   a base64 thumbnail on demand
c) Store thumbnails in the container separately (already done — `CaptureService` generates
   them but only returns them in `CaptureResult` during live capture, not saved to DB)

**Decision needed for W9:** The simplest path is to add a `capture:getThumbnail(captureId)`
IPC that calls `container.extractImage(containerId, 'images/original/'+filename)` and
runs a quick sharp resize to return a base64 thumbnail. `SessionDetailPage` then loads
thumbnails lazily per capture row.

### W9-NEED-5 — `ProjectOverviewPage` needs `project:get` to return `storagePath` — now fixed (GAP-T3)

`ProjectService.get()` now injects `storagePath` from the handle. ✓ Already resolved.

### W9-NEED-6 — `[PH2-ROUTING]` HashRouter migration — must land before Phase 3

`nav-store.ts` uses a custom page-dispatch system. `goBack()` doesn't restore params.
Deep-linking to sessions won't work. Report Builder (Phase 3) needs `session/:id` routes.
This must be done in W9 as planned, not deferred again.

---

## PART 4 — EXECUTION ORDER

### Fix now (before committing for Asus gate):

1. **NEW-1** — `derivedCounts()` use `capture.statusTag` ← 5 lines, no risk
2. **NEW-2** — `CaptureThumbnail` remove `statusTag` prop, use `capture.statusTag` ← 10 lines
3. **NEW-3** — Update stale comment ← 1 line
4. **NEW-4** — Dashboard "View all" → real navigation ← 3 lines
5. **NEW-5** — Wire `showToast` for project open errors in ProjectListPage + DashboardPage ← 8 lines each
6. **NEW-7** — Remove notes textarea from DetailPanel (or wire it) ← decision required
7. **NEW-8** — ThemeStorageStep restore data-theme on unmount ← 6 lines

### Add to W9 sprint brief (not blocking, but must be tracked):

8. **W9-NEED-2** — Add `session:list` IPC (4 files) — DAY 1 of W9 before SessionListPage
9. **W9-NEED-3** — Add `capture:list` IPC (5 files) — DAY 1 of W9 before SessionDetailPage
10. **W9-NEED-4** — Decide thumbnail strategy for SessionDetailPage
11. **W9-NEED-6** — PH2-ROUTING HashRouter migration

### Acceptable debt (document, defer):

- NEW-6, NEW-9, NEW-10, NEW-11, NEW-12, NEW-13, NEW-14, NEW-16

---

## PART 5 — OVERALL VERDICT

The codebase is in good shape for W9. The architecture is sound, all 12 rules hold,
347 tests pass, typecheck is clean, and the major pre-W9 gaps are closed.

The 3 BLOCK items (NEW-1, NEW-2, NEW-3) are a direct consequence of GAP-T1 being
fixed — `CaptureResult` now has `statusTag` but two callers weren't updated to use it.
These are quick fixes (< 20 lines total) and should land in the same commit as the
current batch before the Asus gate runs.

The 2 W9 infrastructure gaps (W9-NEED-2, W9-NEED-3) are the most important
pre-work item: `session:list` and `capture:list` IPC handlers do not exist, and
`SessionListPage` and `SessionDetailPage` cannot be written without them. These
should be the first thing written on Day 1 of W9 before any page work begins.
