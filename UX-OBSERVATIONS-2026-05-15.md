# UX-OBSERVATIONS-2026-05-15.md
*Manual testing observations from Asus TUF — 2026-05-15. Linked from INBOX-TO-CTS.*
*See INBOX-TO-CTS.md for the work-order entry.*

---

## Session log context

- `npm run dev` → onboarding, project creation (`proj_01KRNENHBW48EA1KKRGET9WMZS`), 3 sessions created + ended (all `captureCount: 0` — hotkey registration used `Ctrl+Shift+*` not `CmdOrCtrl+Shift+*`, see terminal note §20)
- `npm run dev:keep` → state preserved, project reopened (`project.open` × 3 in one session — investigate double-open)
- All sessions ended with `captureCount: 0` — captures not registering, see §13 toolbar + §20 logs

---

## Observations

### 1. Onboarding — "All Set" screen not scrollable on small window

- **Observed:** Final onboarding screen ("All Set") cannot be scrolled when window is minimized. "Get Started" button is below the fold and unreachable without maximizing the window.
- **Expected:** The screen should be scrollable regardless of window height. Keyboard Tab+Enter should also reach the button.
- **File likely:** `src/renderer/pages/OnboardingPage.tsx` or the AllSet step component — check that the step container has `overflow-y: auto` and a defined `max-height`.
- **Priority:** High — blocks first-run flow on smaller monitors.

---

### 2. Close button tooltip misaligned — vertical text stack

- **Observed:** When hovering over the title-bar close (×) button, the tooltip text renders as a vertical character stack instead of a horizontal string.
- **Expected:** Tooltip renders as a normal horizontal single-line label.
- **File likely:** Custom tooltip component or CSS — check `white-space: nowrap` is applied; the tooltip wrapper may be collapsing to zero width forcing text to wrap.
- **Priority:** Medium — polish issue visible on every window.

---

### 3. Settings — no save button per tab; changes not persisted

- **Observed:** Settings tabs (Profile, Hotkeys, Appearance, Storage, etc.) have no Save button. Editing a field has no visible commit mechanism; changes do not persist.
- **Expected:** Each tab should have its own Save button. On click: validate, write to DB / settings.json, show success toast, reflect changes immediately across the app.
- **File likely:** `src/renderer/pages/AppSettingsPage.tsx` — add per-tab save handlers that call `window.evidexAPI.settings.update(...)`.
- **Priority:** High — settings are non-functional without this.

---

### 4. Settings — Profile tab — Role field should be a dropdown

- **Observed:** Role field is a plain text input.
- **Expected:** A dropdown matching the onboarding role selector: predefined roles (Tester, Lead Tester, Test Manager, QA Manager, …) **plus** an "Other" option that reveals a free-text input for a custom role.
- **File likely:** `src/renderer/pages/AppSettingsPage.tsx` Profile tab — mirror the role component from `src/renderer/onboarding/UserProfileStep.tsx`.
- **Priority:** High — consistency with onboarding; raw text allows invalid values.

---

### 5. Settings — Hotkeys tab — no instruction text; no active-key highlight; no valid/invalid feedback

- **Observed:** Hotkeys tab shows bindings but provides no guidance on how to change them, no visual indication of which binding is being edited, and no feedback on whether a combo is valid (duplicate / reserved).
- **Expected:**
  - Instruction text at the top: "Click a binding then press the desired key combination."
  - The binding being edited should have a highlighted (focused/active) border state.
  - Valid combos → green border; conflicts or reserved keys → red border.
- **File likely:** `src/renderer/pages/AppSettingsPage.tsx` Hotkeys tab — add `onKeyDown` capture handler, active-index state, and conflict detection via `detectHotkeyConflicts()` from `src/renderer/onboarding/hotkey-utils.ts`.
- **Priority:** High — Hotkeys tab is unusable without this.

---

### 6. Settings — Appearance tab — text-size selector active state broken

- **Observed:** After selecting "Large" text size, the "Normal" button still displays the active (blue) highlight. Active state does not follow the selection.
- **Expected:** Only the currently selected size button should show the active highlight.
- **File likely:** `src/renderer/pages/AppSettingsPage.tsx` Appearance tab — check the conditional class binding for the size buttons; the active value likely reads from stale state rather than the committed setting.
- **Priority:** Medium.

---

### 7. Settings — Storage tab — buttons render outside the container box

- **Observed:** Action buttons in the Storage tab overflow outside the white card/box boundary.
- **Expected:** All buttons and content are fully enclosed within the card. Card grows to fit its content, or content scrolls inside.
- **File likely:** `src/renderer/pages/AppSettingsPage.tsx` Storage tab — check flex/grid layout; likely missing `overflow: hidden` or the card height is hard-coded.
- **Priority:** Medium — looks broken.

---

### 8. Settings — Full redesign required

- **Scope:** All tabs — Profile, Hotkeys, Appearance, Storage (and any future tabs).
- **Design direction:** Modern, professional, premium. Use Fluent icons, gradient accents, card-based tab content, proper spacing, smooth transitions between tabs. Align with the overall Fluent Design System used throughout the app.
- **Functional requirement:** Implement all fixes from §3–§7 as part of this redesign. Do not ship the redesign without working Save, working Role dropdown, working hotkey capture, working active states, and correct layout containment.
- **Priority:** High — must be done before Phase 3 gate.

---

### 9. Project screen — full redesign with card grid and search

- **Observed:** Project list is a plain list with minimal UI.
- **Expected:**
  - Card grid layout. Each card shows: project title, client name, truncated description.
  - Each card has a subtle random light gradient background + relevant icon.
  - Search bar at the top to filter projects by name / client.
  - Cards should feel premium and modern; consistent with the Fluent Design System.
- **File likely:** `src/renderer/pages/ProjectListPage.tsx` (or equivalent project list page).
- **Priority:** High — first screen users see after onboarding.

---

### 10. Project Settings — allow editing project name, client name, description

- **Observed:** The Project Settings tab (session screen sidebar) has no editable fields for the core project metadata.
- **Expected:** Users can edit project name, client name, and description inline and save the changes (calls `project:update` IPC).
- **File likely:** `src/renderer/pages/ProjectSettingsPage.tsx` — wire the existing `project:update` IPC channel.
- **Priority:** Medium.

---

### 11. New Session modal — test data input redesign

- **Observed:** "Add Test Data" button does not open structured inputs.
- **Expected:** Each click of "Add Test Data" appends a pair of inputs: **Data Field Name** and **Data Value**. Repeating clicks add more pairs. Each pair can be removed individually.
- **File likely:** `src/renderer/components/modals/SessionIntakeModal.tsx` — replace the current `testDataMatrix` text area with a dynamic key-value pair list.
- **Priority:** High — current implementation is not user-friendly.

---

### 12. New Session modal — Tester Name must be read-only

- **Observed:** Tester Name field is editable in the new session modal.
- **Expected:** Field is pre-filled from the user profile (settings) and **disabled** — user cannot change it per session. If profile name is not set, show a placeholder "Set in Settings → Profile".
- **File likely:** `src/renderer/components/modals/SessionIntakeModal.tsx` — add `disabled` + read from settings store.
- **Priority:** High — tester attribution must come from the authenticated profile.

---

### 13. Quick toolbar — multiple critical issues

All issues below are observed during a live session with the quick toolbar active:

- **Width overflow:** Toolbar pill is excessively wide on the right side after the collapse button. Clamp the total pill width proportionally.
- **Capture count not updating:** Snapshot count in the toolbar (after Test ID) does not increment when a capture is taken. `SESSION_STATUS_UPDATE` event is apparently not updating the toolbar counter.
- **Region capture broken from toolbar:** Clicking the Region capture button in the toolbar does nothing. Shortcut `Ctrl+Shift+3` works. Investigate the IPC call path from toolbar button → `capture:screenshot`.
- **Session end from toolbar does not persist:** Clicking "End" in the toolbar closes the toolbar but the session remains visible as "Live" with "End session" still enabled in the session gallery. The session is not written as ended in the DB. Root cause: the toolbar's End handler likely fires `session.end` on the wrong IPC path or the container.save is not being called after the toolbar-initiated end.
- **Drag out-of-viewport:** Dragging the toolbar to the edge of the screen lets it escape the viewport. If implementing drag is complex, fix toolbar to top-centre (fixed position) and remove drag entirely.
- **App interaction blocking:** When the toolbar is visible it blocks minimize/maximize controls of other applications. The toolbar BrowserWindow should use `setAlwaysOnTop` with a lower level or apply `ignoreMouseEvents` outside the pill bounds.
- **File likely:** `src/toolbar/App.tsx`, `src/main/window-manager.ts` (toolbar window creation), `src/main/services/session.service.ts` (end path from toolbar).
- **Priority:** Critical — toolbar is the primary capture interface during a live session.

---

### 14. Region capture — use snipping-tool-style dark overlay

- **Observed:** Region capture uses a blue selection box on a plain background.
- **Expected:** Full-screen dark semi-transparent overlay; when user drags to select a region, the overlay is **removed** (cut out) from that region, revealing the underlying screen — identical to the Windows Snipping Tool rectangle mode.
- **File likely:** `src/region/App.tsx` — replace the current blue box drawing with a canvas-based overlay that uses `globalCompositeOperation: 'destination-out'` (or equivalent) to cut the selected rect from the dark overlay.
- **Priority:** High — UX parity with platform standard.

---

### 15. Default capture status should be Pass (P), pre-selected

- **Observed:** New sessions start with no default tag, so captures are tagged "Untagged".
- **Expected:** When a session starts, the toolbar's next-tag selection should default to **Pass**. All captures taken without an explicit tag change are recorded as `pass`.
- **File likely:** `src/toolbar/App.tsx` — change `useState<StatusTag>('untagged')` to `useState<StatusTag>('pass')`.
- **Priority:** High — changes the default quality signal for all captures.

---

### 16. Session Gallery — capture thumbnail card redesign

- **Observed:** Thumbnails are plain images with minimal metadata.
- **Expected:** Each thumbnail becomes a structured card:
  - **Header:** capture sequence number (`#1`, `#2`, …) as a pill on the left; file size in KB as a pill on the right. Header is **not clickable**.
  - **Body:** the captured screenshot thumbnail — **clicking body or card body** opens the detail panel (existing behaviour).
  - **Footer:** status pill (pass/fail/blocked/skip/untagged) on the left; captured time next to it; delete icon on the far right that permanently deletes the capture from the session and `.evidex` container. Footer is **not clickable** (except delete icon).
- **File likely:** `src/renderer/components/ui/CaptureThumbnail.tsx` — redesign the card structure; wire delete to a new `capture:delete` IPC (or reuse existing if available).
- **Priority:** High — core gallery UX.

---

### 17 & 18. Capture detail panel — redesign + additional details feature

- **Observed:** Detail panel shows raw metadata without visual hierarchy or the ability to add notes.
- **Expected layout:**
  - **Card header:** title (e.g. "Capture #3") on the left; close (×) button on the right.
  - **Thumbnail:** full-width screenshot preview below header.
  - **Details section:**
    - Row 1: filename (full width).
    - 2-column grid for remaining details: Date | Time | SHA-256 Hash | File size.
  - **Additional Details section:** labelled "Additional Details". Each entry is a pair: **Title** + **Description**. A **+ Add detail** button appends a new pair. Pairs are persisted as part of the capture record (or as annotation metadata).
  - **Status pill:** large pill-style button with gradient border matching the status colour. Clicking cycles the status (or opens a status picker).
  - **Card footer:**
    - Left edge: ← Previous capture button.
    - Centre: **Annotate** button.
    - Right edge: Next capture → button.
- **Priority:** High — detail panel is the primary per-capture review surface.
- **File likely:** `src/renderer/pages/SessionGalleryPage.tsx` (DetailPanel sub-component) or a dedicated `CaptureDetailPanel.tsx`.

---

### 19. Annotation workspace — full production redesign *(Phase 3 scope — deferred)*

See the full specification below. **Deferred to Phase 3.** Do not start until §1–§18 are complete and gated GREEN.

#### Architecture

```
annotation/
  components/
    AnnotationWorkspace/   — root container, glassmorphism shell
    Toolbar/               — top: Undo/Redo/Zoom/Save/Close
    ToolRail/              — left: all drawing tools
    PropertiesPanel/       — right: stroke/colour/opacity/font/layer controls
    CanvasWorkspace/       — centre: FabricJS canvas (base layer + annotation layer)
    StatusBar/             — bottom: dimensions, mouse coords, zoom %
  hooks/
    useAnnotationHistory   — undo/redo stack (Ctrl+Z/Y)
    useCanvasZoom          — zoom state, wheel handler, keyboard shortcuts
    useToolState           — active tool + properties
    useAnnotationObjects   — fabric object CRUD + layer ordering
  stores/
    annotationStore.ts     — Zustand: image state, zoom, canvas, tool, history
  types/
    annotation.ts          — FabricCanvasJSON extensions, tool enums, export types
  utils/
    fabricHelpers.ts       — fabric object factory functions
```

#### Visual style

- Fluent Design System + premium glassmorphism.
- Acrylic blur on panels, soft elevation shadows, 12–16px rounded corners.
- Light and dark theme support (follows app theme setting).
- Consistent icon system (Fluent icons).

#### Top toolbar (left → right)

`Back` | `Undo (Ctrl+Z)` | `Redo (Ctrl+Y)` | `Zoom Out` | `[Zoom %]` | `Zoom In` | `Reset` | `Save` | `Close`

#### Left tool rail

Cursor · Pan · Pen · Arrow · Rectangle · Circle · Rounded Rectangle · Line · Highlighter · Text · Crop · Blur region · Numbered step marker · Callout bubble · Eraser · Colour picker

#### Right properties panel (context-sensitive)

Active tool label · Stroke width slider · Colour swatch picker · Opacity slider · Font settings (text tool only) · Shape settings · Layer order (Bring forward / Send back)

#### Canvas features

- Zoom 25 %–500 %; mouse-wheel zoom preserving cursor focus point.
- GPU-accelerated transforms via CSS `will-change: transform`.
- Fit-to-screen on load; keyboard shortcuts `+`/`-`, `0` to reset.
- Drag/pan with Space held.
- Shift-constrained drawing for rectangles, circles, lines.

#### Annotation objects (all must be editable post-placement)

Free draw pen · Highlighter · Arrow · Straight line · Rectangle · Circle · Rounded rectangle · Text · Blur region · Crop · Numbered step marker · Callout bubble · Eraser

Each object supports: drag · resize handles · rotate handle · delete (Delete key) · duplicate (Ctrl+D) · recolour · layer order.

Multi-select: click + Shift; rubber-band drag. Bounding box shown. Snap guides + alignment helpers.

#### Keyboard shortcuts

| Action | Shortcut |
|---|---|
| Undo | Ctrl+Z |
| Redo | Ctrl+Y |
| Delete selection | Delete |
| Cancel / deselect | Esc |
| Copy | Ctrl+C |
| Paste | Ctrl+V |
| Select all | Ctrl+A |
| Pan mode | Space (hold) |
| Constrained draw | Shift (hold) |
| Zoom in/out | Ctrl+`+` / Ctrl+`-` |
| Reset zoom | Ctrl+0 |

#### Save / Export

- **Save to session:** serialise `FabricCanvasJSON` + base image → stored in `annotation_layers` table via existing `annotation:save` IPC. `fabricVersion` written per Architectural Rule 12.
- **Export:** PNG, JPG — flatten canvas to data URL → file via Electron `dialog.showSaveDialog`.

#### Electron integration

- Opened via `capture:openAnnotation` IPC → dedicated `annotation` BrowserWindow (existing).
- `annotation:load` event pushes `{ captureId, imageDataUrl, existingLayers }` to the annotation window.
- On save: `annotation:save` IPC → `AnnotationSaveInput` validated by Zod schema.

#### Performance

- `requestAnimationFrame` for all canvas mutations.
- Throttle `mousemove` events to 60 fps.
- `fabric.Object` caching enabled.
- Avoid full canvas re-renders on property-panel changes — update object properties via `object.set()` + `canvas.requestRenderAll()`.

---

### 20. Terminal log review — bugs identified

CTS should review the following observations from the dev session logs:

#### 20a. Shortcut bindings use `Ctrl+` instead of `CmdOrCtrl+`

```
"bindings":{"captureFullscreen":"Ctrl+Shift+1","captureActiveWindow":"Ctrl+Shift+2",...}
```

`session.service.ts` → `resolveHotkeyBindings()` falls back to `DEFAULT_HOTKEY_BINDINGS` which uses `CmdOrCtrl+Shift+*`. However the logged bindings show `Ctrl+Shift+*`. This suggests the settings hotkeys stored in `settings.json` were written with `Ctrl+` prefix (from the renderer's `hotkey-utils.ts` format) and `resolveHotkeyBindings` is reading them verbatim without passing through `toElectronAccelerator()`. Verify that `resolveHotkeyBindings` always applies `toElectronAccelerator()` to user-stored bindings (not just the defaults).

**File:** `src/main/services/session.service.ts` → `resolveHotkeyBindings()`

#### 20b. `project.open` called 2–3 times in rapid succession

```
{"msg":"project.open","meta":{"projectId":"proj_01KRNENHBW48EA1KKRGET9WMZS",...}}  ← 10:35:45
{"msg":"project.open","meta":{"projectId":"proj_01KRNENHBW48EA1KKRGET9WMZS",...}}  ← 10:35:51
```

`project:open` IPC is being invoked multiple times for the same project within seconds. Likely a double-click or React strict-mode double-effect issue. Add a guard in `ProjectService.open()` to no-op if the requested project is already the open container.

**File:** `src/main/services/project.service.ts` → `open()`

#### 20c. All sessions ended with `captureCount: 0`

Three sessions were created and ended; all had `captureCount: 0`. This correlates with:
- Shortcut bindings possibly being stored in `Ctrl+` format (see §20a) — if Electron registered `Ctrl+Shift+1` and the OS intercepted `CmdOrCtrl+Shift+1` differently, captures may have silently failed.
- Region capture broken from toolbar (§13).
- Review whether `capture:screenshot` IPC ever returned an error during these sessions (not visible in these logs — add error logging to the capture IPC handler).

---

## Summary — priority order for CTS

| Priority | § | Issue |
|---|---|---|
| P0 — Critical | 13 | Quick toolbar: end-session not persisting, region broken, count not updating, blocking other apps |
| P0 — Critical | 20a | `resolveHotkeyBindings` not converting `Ctrl+` to `CmdOrCtrl+` for stored settings |
| P1 — High | 3, 8 | Settings: no save buttons + full redesign |
| P1 — High | 15 | Default capture tag = Pass |
| P1 — High | 1 | Onboarding all-set screen not scrollable |
| P1 — High | 11 | New session modal: test data key-value pairs |
| P1 — High | 12 | New session modal: tester name disabled |
| P1 — High | 14 | Region capture: snipping-tool overlay style |
| P1 — High | 16 | Capture thumbnail card redesign |
| P1 — High | 17, 18 | Capture detail panel redesign |
| P1 — High | 9 | Project screen card redesign with search |
| P2 — Medium | 4 | Settings: Role dropdown |
| P2 — Medium | 5 | Settings: Hotkey capture UX |
| P2 — Medium | 6 | Settings: Appearance active-state bug |
| P2 — Medium | 7 | Settings: Storage tab layout overflow |
| P2 — Medium | 2 | Close button tooltip misaligned |
| P2 — Medium | 10 | Project Settings: edit project metadata |
| P2 — Medium | 20b | Double `project.open` calls |
| P3 — Phase 3 scope | 19 | Annotation workspace full redesign — **deferred, do not start until §1–§18 GREEN** |

---

## Decisions locked (2026-05-15)

| § | Decision |
|---|---|
| §3 | Live-save kept. Add `✓ Saved` toast after each `patch()` call. No explicit Save button. |
| §16 delete | Ship redesigned card with **disabled** delete icon + "Delete coming in Phase 3" tooltip. Full `capture:delete` IPC is Phase 3 scope. |
| §19 | Deferred to Phase 3. Blocking condition: §1–§18 all complete and gate GREEN. |
