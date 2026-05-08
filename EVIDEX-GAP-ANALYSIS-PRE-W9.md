# Vision-EviDex — Pre-Week-9 Gap Analysis
**Generated: 2026-05-07 | Based on full codebase read**
**Scope: all gaps identified across shared types, services, renderer, preload, and IPC**

Each item is tagged: DOABLE (fix on CTS before W9, no Asus rebuild needed) or
DEFERRED (requires main-process change + Asus gate, leave for W9 sprint).
Severity: 🔴 Will cause a real bug in W9 · 🟠 Wrong behaviour visible now · 🟡 Technical debt · 🟢 Cleanup

---

## SECTION 1 — Shared types (`src/shared/types/entities.ts`)

### GAP-T1 🔴 DOABLE — `CaptureResult` missing `statusTag` field

`CaptureResult` is the type returned by `CaptureService.screenshot()` and stored in
`session.store.captures[]`. The DB entity `Capture` has `statusTag: StatusTag` but
`CaptureResult` does not.

`DetailPanel` does `capture.statusTag ?? 'untagged'` — the `??` hides the missing field
today, but it means the tag picker ALWAYS shows "untagged" even after the user tags
a capture. The optimistic update in `session.store.ts` does `{ ...c, statusTag: tag }
as CaptureResult` — a cast that only works because TS doesn't validate the missing field.
In W9 `SessionDetailPage` will read capture tags from the DB and need this field to exist.

**Fix — 2 files:**
```ts
// entities.ts — add statusTag to CaptureResult
export interface CaptureResult {
  captureId:     string;
  filename:      string;
  sha256Hash:    string;
  fileSizeBytes: number;
  thumbnail:     string;
  capturedAt:    string;
  statusTag:     StatusTag;  // ← ADD
}
```
```ts
// capture.service.ts — include statusTag in return
return {
  captureId,
  filename,
  sha256Hash,
  fileSizeBytes: compressed.byteLength,
  thumbnail: `data:image/jpeg;base64,${thumbnailBuf.toString('base64')}`,
  capturedAt,
  statusTag,   // ← ADD (const statusTag already computed above)
};
```

---

### GAP-T2 🔴 DOABLE — `RecentProject` missing `clientName` — cast in UI never actually reads data

`RecentProject` has no `clientName` field. Both `DashboardPage` and `ProjectListPage`
work around this with `(p as RecentProject & { clientName?: string }).clientName`.
The cast compiles but `clientName` is never saved to `recent_projects` in the DB, so
the fallback `p.filePath.split('\\').pop()` is always shown — never the actual client name.

**Fix — 4 files:**

1. `entities.ts` — add `clientName: string` to `RecentProject`
2. `database.service.ts` — add `client_name` column to `recent_projects` schema, update
   `upsertRecentProject` to save it, update `getRecentProjects` mapper to return it.
   Use `ALTER TABLE recent_projects ADD COLUMN client_name TEXT NOT NULL DEFAULT ''`
   after the `CREATE TABLE IF NOT EXISTS` to handle existing DBs on Asus.
3. `project.service.ts` — pass `clientName: project.clientName` in both `create()` and `open()`
   calls to `upsertRecentProject`.
4. `DashboardPage.tsx` + `ProjectListPage.tsx` — remove the two type casts.

**Note:** `database.service.ts` and `project.service.ts` are main-process files.
This means Asus needs to run a gate after this change. Treat as a mini-sprint:
fix all 4 files, push, request Asus gate, proceed to W9 only after green.

---

### GAP-T3 🟠 DOABLE — `mapProject` leaves `brandingProfileId` as `''` and `storagePath` as `''`

```ts
// database.service.ts mapProject()
brandingProfileId: '',  // comment says "populated from brandingProfile JSON on demand by caller"
storagePath: '',        // comment says "owned by container handle"
```

Both are intentionally empty but no caller ever populates them. `activeProject.brandingProfileId`
and `activeProject.storagePath` are always `''` in the renderer. W9's `ProjectOverviewPage`
needs both. Fix:

```ts
// database.service.ts mapProject() — recover brandingProfileId from the snapshot JSON
try {
  const snapshot = JSON.parse(r.branding_profile) as BrandingProfile | null;
  if (snapshot) {
    base.brandingProfile = snapshot;
    base.brandingProfileId = snapshot.id;   // ← recover from snapshot
  }
} catch { /* leave empty */ }
```
```ts
// project.service.ts get() — inject storagePath from handle
get(projectId: string): Project | null {
  const handle = this.deps.container.getCurrentHandle();
  if (!handle || handle.projectId !== projectId) return null;
  const project = this.deps.container.getProjectDb()?.getProject(projectId) ?? null;
  if (!project) return null;
  return { ...project, storagePath: handle.filePath };  // ← inject real path
}
```

---

### GAP-T4 🟡 DEFERRED — `mapCapture` sets `testerName: ''` always

The `captures` table doesn't store `tester_name` — the session owns it. `mapCapture`
leaves it blank. `SessionDetailPage` (W9) will show empty tester fields on each capture.
Proper fix requires a JOIN or post-enrichment. Add to BACKLOG for Phase 3.

---

## SECTION 2 — Preload bridge (`src/preload/preload.ts`)

### GAP-P1 🔴 DOABLE — `project.create` typed as `input: unknown` — no type safety at call site

```ts
project: {
  create: (input: unknown): Promise<IpcResult<Project>> =>
```

Every other IPC method is properly typed. This one uses `unknown`, meaning TypeScript
cannot catch type errors when `project.store.ts` calls `evidexAPI.project.create(input)`.

**Fix:**
```ts
import type { ProjectCreateInput } from '@shared/schemas';
...
create: (input: ProjectCreateInput): Promise<IpcResult<Project>> =>
  ipcRenderer.invoke(IPC.PROJECT_CREATE, input),
```

---

### GAP-P2 🟡 NOTE — `session.get` return is `IpcResult<Session | null>` — W9 pages must handle null

Not a bug, but W9 `SessionDetailPage` must check for `null`. Document so it's not
forgotten when writing the page.

---

## SECTION 3 — IPC router (`src/main/ipc-router.ts`)

### GAP-R1 🟡 DEFERRED — `CAPTURE_TAG_UPDATE` returns `IpcResult<null>` but preload types it as `IpcResult<void>`

Minor type mismatch. `capture.updateTag` in the preload is typed as `Promise<IpcResult<void>>`
but the handler returns `null`. Not a runtime bug. Fix in W9 when touching the capture IPC.

### GAP-R2 🟢 DOABLE — Hardcoded "(26 live, 9 stub)" in console.info log

```ts
console.info(`[ipc-router] ${Object.values(IPC).length} handlers registered (26 live, 9 stub)`);
```

The dynamic count is correct but the breakdown string drifts as stubs are wired.
This is what Asus reads to verify the app booted correctly. Change to just:
```ts
console.info(`[ipc-router] ${Object.values(IPC).length} handlers registered`);
```

---

## SECTION 4 — Renderer stores

### GAP-S1 🔴 DOABLE — `session.store.ts` module-level `onCaptureArrived` subscription never torn down

```ts
// session.store.ts — runs once at module import, lives forever
if (typeof window !== 'undefined' && window.evidexAPI?.events?.onCaptureArrived) {
  window.evidexAPI.events.onCaptureArrived((capture) => {
    useSessionStore.getState().addCapture(capture);
  });
}
```

The unsubscribe function returned by `onCaptureArrived` is discarded. The `ipcRenderer.on`
listener accumulates across hot-reloads in dev. More importantly: if a capture IPC
message arrives after `clearSession()` (queued messages, network delay), it appends
to an empty captures array in a state where `activeSession` is null — corrupting the
next session's capture list.

**Fix — move subscription into the session lifecycle:**
```ts
// Add to store state interface:
_captureListener: (() => void) | null;

// In startSession — after set():
const off = window.evidexAPI.events.onCaptureArrived((capture) => {
  useSessionStore.getState().addCapture(capture);
});
set({ activeSession: result.data, captures: [], isCapturing: false, _captureListener: off });

// In clearSession:
get()._captureListener?.();
set({ activeSession: null, captures: [], isCapturing: false, _captureListener: null });
```

Also remove the module-level subscription block entirely.

---

### GAP-S2 🟡 DOABLE — `nav-store.ts` `goBack()` doesn't restore params — back from Settings loses session context

```ts
goBack: () =>
  set((s) => {
    const previous = s.history[s.history.length - 1]!;
    return { page: previous, history: s.history.slice(0, -1) };
    // ← currentProjectId and currentSessionId not restored
  }),
```

Navigating `session-gallery` → `settings` then pressing Back returns to `session-gallery`
page name but `currentSessionId` was cleared when navigating to `settings`. The gallery
guard `if (!projectId || !sessionId) goBack()` then fires again, creating an infinite
back loop. This needs the history stack to store params.

**Proper fix** belongs in `[PH2-ROUTING]` (HashRouter migration). For now add a
`// TODO PH2-ROUTING` comment and work around in the gallery by not using `settings`
navigation during an active session.

---

### GAP-S3 🟡 NOTE — `project.store.ts` `isLoading` flag is shared between `createProject`, `openProject`, and `loadRecent`

All three set `isLoading: true/false`. When `createProject` calls `loadRecent` internally,
the flag toggles twice. Not a bug since both set it false, but confusing. Consider a
separate `isLoadingRecent` flag in W9 when `ProjectOverviewPage` needs more granular states.

---

## SECTION 5 — Renderer pages

### GAP-U1 🟠 DOABLE — `SessionIntakePage` tester name never pre-fills — settings load race

```ts
const [settings, setSettings] = useState<Settings | null>(null);
// settings loads async ~50ms after mount
const testerNameDefault = settings?.profile?.name ?? ''; // always '' on first render

return <SessionIntakeModal testerNameDefault={testerNameDefault} ... />;
// Modal initialises form.testerName from testerNameDefault in useState(() => ...)
// useState initialiser runs ONCE — settings arriving later don't update it
```

The user always sees a blank tester name field and must type it manually every session.

**Fix:** Don't render the modal until settings resolve:
```tsx
import { ProgressRing } from '../components/ui';

if (!settings) return (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100%', gap: 'var(--space-3)' }}>
    <ProgressRing size={32} label="Loading session defaults…" />
  </div>
);
```

---

### GAP-U2 🟢 DOABLE — `ThemeProvider.tsx` JSDoc is stale (references FUI-1/FUI-4, says "page reloads")

Update the comment block to reflect current behaviour: theme is applied immediately
via `data-theme` attribute, settings-updated broadcast is on BACKLOG.

---

### GAP-U3 🟠 DOABLE — `Toast` component built but fully disconnected — no provider, no hook, no container

`Toast.tsx` is complete with correct Framer Motion integration. Nothing uses it.
Every error in the codebase is either a local `<div role="alert">` or `console.error`.
W9 pages need a consistent error/success surface.

**Fix — 3 files:**

**`src/renderer/providers/ToastProvider.tsx`** (new file):
```tsx
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Toast, type ToastSeverity } from '../components/ui/Toast';

interface ToastItem { id: string; severity: ToastSeverity; title: string; body?: string; }
interface ToastContextValue { showToast: (severity: ToastSeverity, title: string, body?: string) => void; }

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((severity: ToastSeverity, title: string, body?: string) => {
    const id = `toast_${Date.now()}`;
    setToasts((t) => [...t, { id, severity, title, body }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 'var(--space-4)', right: 'var(--space-4)',
        display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', zIndex: 100,
        pointerEvents: 'none' }}>
        <AnimatePresence>
          {toasts.map((t) => (
            <Toast key={t.id} severity={t.severity} title={t.title} body={t.body}
              onDismiss={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
```

**`App.tsx`** — wrap `AppShell` with `ToastProvider`:
```tsx
export function App(): JSX.Element {
  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
```

**Export from `providers/index.ts`** if one exists, or import directly.

---

## SECTION 6 — Main process

### GAP-M1 🔴 DEFERRED — `recent_projects` DB schema missing `client_name` column

Related to GAP-T2. The `initAppSchema()` `CREATE TABLE IF NOT EXISTS` DDL must add
`client_name TEXT NOT NULL DEFAULT ''`. Since Asus already has the table without this
column, add `ALTER TABLE recent_projects ADD COLUMN client_name TEXT NOT NULL DEFAULT ''`
after the `CREATE TABLE IF NOT EXISTS` block. SQLite silently ignores `ADD COLUMN` if
the column already exists (it doesn't — but this is defensive).

---

### GAP-M2 🟡 DEFERRED — `metrics.service.ts` filename mismatch vs CLAUDE.md §3

Already in BACKLOG. Reconcile before Phase 3 metrics import implementation.

---

### GAP-M3 🟡 DEFERRED — `project.service.ts` access log `performedBy: ''` everywhere

Access log entries have empty `performedBy`. Phase 4 audit hardening should inject
the tester name from the open session or the settings profile. Leave for now.

---

## SECTION 7 — Project state

### GAP-D1 🟢 DOABLE — `CLAUDE.md §8` test count stale — update after Asus gate confirms new total

### GAP-D2 🟢 DOABLE — `CLAUDE.md §8a` comms note still says "CTS writes INBOX" — update to reflect connector

---

## Execution order (Batch A first — before W9 starts)

### Batch A — Critical type + behaviour fixes (all DOABLE, ship together)
1. GAP-T1 — `CaptureResult.statusTag` + `capture.service.ts` return
2. GAP-T2 — `RecentProject.clientName` + DB schema + project.service + renderer casts
3. GAP-T3 — `mapProject` brandingProfileId + storagePath recovery
4. GAP-P1 — `preload.ts` project.create typed input
5. GAP-S1 — `session.store.ts` capture subscription lifecycle
6. GAP-U1 — `SessionIntakePage` tester name race guard
7. GAP-U3 — `ToastProvider` + wire into App.tsx

**Gate:** Push → Asus pulls → `npm run report` → expect 347/347 PASS, typecheck PASS.
If GAP-T2 (DB schema) causes test failures (unlikely — tests mock the DB), fix and re-gate.

### Batch B — Cleanup (same commit or separate, zero risk)
- GAP-R2, GAP-U2, GAP-S2 comment, GAP-D1, GAP-D2

### Deferred — W9 sprint or later
- GAP-T4, GAP-P2, GAP-R1, GAP-S3, GAP-M1 (note: M1 must land WITH GAP-T2), GAP-M2, GAP-M3

---

## Summary

| Severity | Batch A | Batch B | Deferred |
|---|---|---|---|
| 🔴 Critical | 3 | 0 | 1 |
| 🟠 High | 2 | 0 | 1 |
| 🟡 Medium | 2 | 1 | 5 |
| 🟢 Cleanup | 0 | 2 | 0 |
| **Total** | **7** | **3** | **7** |
