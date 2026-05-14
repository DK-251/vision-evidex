/**
 * Hotkey remap + conflict detection helpers.
 *
 * HK-01 fix: all action IDs now use `captureActiveWindow` (aligned with shortcut.service.ts).
 * HK-03 fix: DEFAULT_HOTKEYS now mirrors DEFAULT_HOTKEY_BINDINGS from shortcut.service.ts.
 *            The renderer format uses `Ctrl+` (not `CmdOrCtrl+`) — the conversion to Electron
 *            accelerator format happens in session.service.ts via toElectronAccelerator().
 *
 * Pure functions — no React, no DOM beyond the KeyboardEvent parameter
 * shape — so the test suite can run them in the node vitest env without
 * a browser.
 */

export interface HotkeyAction {
  id: string;
  label: string;
  description: string;
  defaultBinding: string;
}

/** HK-01 + HK-03: 6 configurable actions, IDs aligned with shortcut.service.ts */
export const HOTKEY_ACTIONS: readonly HotkeyAction[] = Object.freeze([
  {
    id: 'captureFullscreen',
    label: 'Capture full screen',
    description: 'Take a screenshot of the entire primary display.',
    defaultBinding: 'Ctrl+Shift+1',
  },
  {
    id: 'captureActiveWindow',   // HK-01: was `captureActiveWindow` in renderer but main read `captureWindow` — now aligned
    label: 'Capture active window',
    description: 'Screenshot the focused application window.',
    defaultBinding: 'Ctrl+Shift+2',
  },
  {
    id: 'captureRegion',
    label: 'Capture region',
    description: 'Drag-select a region to capture.',
    defaultBinding: 'Ctrl+Shift+3',
  },
  {
    id: 'tagPass',
    label: 'Tag last capture as PASS',
    description: 'Mark the most recent capture as passing.',
    defaultBinding: 'Ctrl+Shift+P',
  },
  {
    id: 'tagFail',
    label: 'Tag last capture as FAIL',
    description: 'Mark the most recent capture as failing.',
    defaultBinding: 'Ctrl+Shift+F',
  },
  {
    id: 'openToolbar',
    label: 'Show / hide toolbar',
    description: 'Toggle the floating capture toolbar.',
    defaultBinding: 'Ctrl+Shift+T',
  },
]);

export const DEFAULT_HOTKEYS: Readonly<Record<string, string>> = Object.freeze(
  HOTKEY_ACTIONS.reduce<Record<string, string>>((acc, a) => {
    acc[a.id] = a.defaultBinding;
    return acc;
  }, {})
);

/**
 * Format a KeyboardEvent into a canonical binding string:
 *   "Ctrl+Shift+1"  (modifiers sorted: Ctrl, Alt, Shift, Meta)
 * Alphanumeric keys are upper-cased; function keys preserved as-is.
 * The renderer always stores `Ctrl+` — session.service converts to
 * `CmdOrCtrl+` before passing to Electron globalShortcut (HK-04).
 */
export function formatKeyEvent(e: Pick<KeyboardEvent, 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey' | 'key'>): string {
  const mods: string[] = [];
  if (e.ctrlKey || e.metaKey) mods.push('Ctrl');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  let key = e.key;
  if (key.length === 1) key = key.toUpperCase();
  return [...mods, key].join('+');
}

/**
 * Scan a hotkey map for duplicate bindings. Returns the set of action
 * ids whose binding appears more than once. `(unset)` or empty strings
 * are never considered conflicting.
 */
export function detectHotkeyConflicts(map: Record<string, string>): Set<string> {
  const byCombo = new Map<string, string[]>();
  for (const [actionId, combo] of Object.entries(map)) {
    if (!combo || combo === '(unset)') continue;
    const list = byCombo.get(combo) ?? [];
    list.push(actionId);
    byCombo.set(combo, list);
  }
  const conflicts = new Set<string>();
  for (const ids of byCombo.values()) {
    if (ids.length > 1) for (const id of ids) conflicts.add(id);
  }
  return conflicts;
}
