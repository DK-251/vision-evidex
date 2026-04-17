/* eslint-disable no-console */
/**
 * Vision-EviDex — verify-setup.js
 *
 * Sanity check for the local dev environment. Run on Asus TUF before any
 * `npm run dev` attempt. Also run on CTS to confirm tooling is consistent.
 *
 *   npm run verify-setup
 *
 * Exits 0 if all checks pass, 1 otherwise. No external network access.
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

let passCount = 0;
let failCount = 0;
let warnCount = 0;

function pass(label, detail = '') {
  passCount++;
  console.log(`${GREEN}✓${RESET} ${label}${detail ? ` ${DIM}(${detail})${RESET}` : ''}`);
}
function fail(label, detail = '') {
  failCount++;
  console.log(`${RED}✗${RESET} ${label}${detail ? ` ${DIM}(${detail})${RESET}` : ''}`);
}
function warn(label, detail = '') {
  warnCount++;
  console.log(`${YELLOW}⚠${RESET} ${label}${detail ? ` ${DIM}(${detail})${RESET}` : ''}`);
}

function check(label, fn) {
  try {
    const result = fn();
    if (result === false) {
      fail(label);
    } else if (typeof result === 'string') {
      pass(label, result);
    } else {
      pass(label);
    }
  } catch (err) {
    fail(label, err.message);
  }
}

console.log('\nVision-EviDex setup verification\n');

// Node version
check('Node >= 22', () => {
  const major = parseInt(process.versions.node.split('.')[0], 10);
  if (major < 22) throw new Error(`got v${process.versions.node}`);
  return `v${process.versions.node}`;
});

// npm version
check('npm available', () => {
  const v = execSync('npm --version', { encoding: 'utf8' }).trim();
  return `v${v}`;
});

// Git version
check('git available', () => {
  const v = execSync('git --version', { encoding: 'utf8' }).trim();
  return v;
});

// Project root artefacts
const root = path.resolve(__dirname, '..');
const musts = [
  'package.json',
  'tsconfig.json',
  'electron.vite.config.ts',
  'electron-builder.config.js',
  'tailwind.config.js',
  'CLAUDE.md',
  '.gitignore',
  '.gitattributes',
  '.env.example',
];
for (const f of musts) {
  check(`file exists: ${f}`, () => fs.existsSync(path.join(root, f)));
}

// Dirs
const dirs = [
  'src/main',
  'src/main/services',
  'src/renderer/pages',
  'src/toolbar',
  'src/annotation',
  'src/region',
  'src/preload',
  'src/shared/types',
  'src/shared/schemas',
  'templates',
  'scripts',
  'run-reports',
];
for (const d of dirs) {
  check(`dir exists: ${d}`, () => fs.existsSync(path.join(root, d)));
}

// 12+1 service stubs
const services = [
  'capture.service.ts',
  'session.service.ts',
  'evidex-container.service.ts',
  'database.service.ts',
  'export.service.ts',
  'metrics-import.service.ts',
  'licence.service.ts',
  'naming.service.ts',
  'manifest.service.ts',
  'settings.service.ts',
  'shortcut.service.ts',
  'tray.service.ts',
  'signoff.service.ts',
];
for (const s of services) {
  check(`service stub: ${s}`, () => fs.existsSync(path.join(root, 'src/main/services', s)));
}

// Native modules — only check package.json entries (rebuild happens via electron-rebuild)
check('better-sqlite3 in deps', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (!pkg.dependencies['better-sqlite3']) throw new Error('missing');
  return pkg.dependencies['better-sqlite3'];
});
check('sharp in deps', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (!pkg.dependencies.sharp) throw new Error('missing');
  return pkg.dependencies.sharp;
});
check('fabric pinned at 5.3.0', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (pkg.dependencies.fabric !== '5.3.0') throw new Error(`got ${pkg.dependencies.fabric}, expected exact 5.3.0`);
  return '5.3.0';
});

// node_modules installed?
check('node_modules present', () => {
  if (!fs.existsSync(path.join(root, 'node_modules'))) throw new Error('run npm install');
  return 'ok';
});

// .env guardrail — must not be tracked (best-effort)
check('.env gitignored', () => {
  const ignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  if (!ignore.includes('.env')) throw new Error('add .env to .gitignore');
  return 'ok';
});

// EVIDEX_APP_SECRET must be set in real environment for keygen builds
if (process.env.EVIDEX_LICENCE_MODE === 'keygen') {
  check('EVIDEX_APP_SECRET set (keygen mode)', () => {
    const s = process.env.EVIDEX_APP_SECRET;
    if (!s || s.length < 32) throw new Error('missing or too short');
    return `len=${s.length}`;
  });
} else {
  warn('EVIDEX_LICENCE_MODE=none or unset — skipping APP_SECRET check');
}

console.log('\n───────────────────────────────────────');
console.log(
  `${GREEN}${passCount} pass${RESET}   ` +
    `${failCount > 0 ? RED : DIM}${failCount} fail${RESET}   ` +
    `${warnCount > 0 ? YELLOW : DIM}${warnCount} warn${RESET}`
);
console.log('───────────────────────────────────────\n');

process.exit(failCount > 0 ? 1 : 0);
