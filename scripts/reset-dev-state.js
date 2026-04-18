#!/usr/bin/env node
/**
 * Reset Vision-EviDex app-level state between `npm run dev` runs so the
 * developer always re-enters the onboarding wizard rather than
 * short-circuiting to the Dashboard.
 *
 * Scope — files deleted:
 *   - settings.json       (clears onboardingComplete + theme + storage path)
 *   - licence.sig         (no-op in `none` mode; cleared anyway for parity)
 *   - app.db + journal    (wipes branding_profiles + recent_projects)
 *
 * Out of scope — kept between runs:
 *   - logs/               (so historical boot logs stay readable)
 *   - anything outside `<appData>/VisionEviDex/`
 *
 * Escape hatch: `npm run dev:keep` skips this reset and launches the
 * app with whatever state was last persisted — useful when iterating
 * on the Dashboard or AppSettings without re-doing onboarding every
 * time.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const APP_DIR_NAME = 'VisionEviDex';

function appDataRoot() {
  if (process.platform === 'win32') {
    return process.env['APPDATA'] || path.join(os.homedir(), 'AppData', 'Roaming');
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support');
  }
  return process.env['XDG_CONFIG_HOME'] || path.join(os.homedir(), '.config');
}

const TARGET = path.join(appDataRoot(), APP_DIR_NAME);

// Safety — refuse to touch anything whose leaf is not exactly 'VisionEviDex'.
if (path.basename(TARGET) !== APP_DIR_NAME) {
  console.error(`[dev-reset] refusing to delete unexpected path: ${TARGET}`);
  process.exit(1);
}

const FILES_TO_DELETE = [
  'settings.json',
  'licence.sig',
  'app.db',
  'app.db-journal',
  'app.db-wal',
  'app.db-shm',
];

function del(p) {
  try {
    fs.rmSync(p, { force: true });
    return true;
  } catch (err) {
    console.warn(`[dev-reset] failed to delete ${p}: ${err.message}`);
    return false;
  }
}

if (!fs.existsSync(TARGET)) {
  console.log(`[dev-reset] no previous state at ${TARGET} — fresh start.`);
  process.exit(0);
}

let deleted = 0;
for (const name of FILES_TO_DELETE) {
  const full = path.join(TARGET, name);
  if (fs.existsSync(full) && del(full)) deleted++;
}

console.log(`[dev-reset] cleared ${deleted} state file(s) from ${TARGET} (logs/ kept).`);
