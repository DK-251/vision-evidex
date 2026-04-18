/* eslint-disable no-console */
/**
 * Vision-EviDex — run-report.js
 *
 * Generates a structured run report after a smoke test on the Asus TUF.
 * Run on Asus: `npm run report`
 *
 * Side effects (in order):
 *   1. Read previous `run-reports/latest.json` (if it exists)
 *   2. Archive previous `latest.*` to `run-reports/history/<sha>-<ts>/`
 *   3. Run all module checks (skeleton in Phase 0 — returns SKIP)
 *   4. Write new `run-reports/latest.json` + `latest.md`
 *   5. Append one JSON line to `run-reports/benchmarks.jsonl`
 *   6. Rewrite `STATUS.md` with the new run state
 *   7. Touch `run-reports/console-latest.log` (real capture wired when
 *      `npm run dev` runs — for now, a placeholder)
 *
 * Exit code: 0 if no FAIL, 1 otherwise.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(ROOT, 'run-reports');
const HISTORY_DIR = path.join(REPORTS_DIR, 'history');
const BENCHMARKS_FILE = path.join(REPORTS_DIR, 'benchmarks.jsonl');
const CONSOLE_LOG = path.join(REPORTS_DIR, 'console-latest.log');
const LATEST_JSON = path.join(REPORTS_DIR, 'latest.json');
const LATEST_MD = path.join(REPORTS_DIR, 'latest.md');
const STATUS_MD = path.join(ROOT, 'STATUS.md');
const FEATURES_MD = path.join(ROOT, 'FEATURES.md');

// ─── Helpers ────────────────────────────────────────────────────────────

function safeExec(cmd, fallback = 'unknown') {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return fallback;
  }
}

function readJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function tsForPath(isoString) {
  // Replace characters that are invalid in Windows paths.
  return isoString.replace(/[:]/g, '-').replace(/\..+$/, 'Z');
}

function getElectronVersion() {
  const pkg = readJSON(path.join(ROOT, 'package.json'));
  if (!pkg) return null;
  return (pkg.devDependencies && pkg.devDependencies.electron) || null;
}

function countFeatures() {
  // Parse FEATURES.md for [ ]/[x] status.
  if (!fs.existsSync(FEATURES_MD)) {
    return { done: 0, total: 0, byModule: {} };
  }
  const text = fs.readFileSync(FEATURES_MD, 'utf8');
  const rowRe = /^\|\s*\[([ x~!])\]\s+([A-Z]{2})-(\d+)\s*\|/gm;
  const byModule = {};
  let done = 0;
  let total = 0;
  let match;
  while ((match = rowRe.exec(text)) !== null) {
    const [, mark, mod] = match;
    byModule[mod] ??= { done: 0, total: 0 };
    byModule[mod].total++;
    total++;
    if (mark === 'x') {
      byModule[mod].done++;
      done++;
    }
  }
  return { done, total, byModule };
}

// ─── Module runners (Phase 0 skeleton) ──────────────────────────────────

const moduleDefs = [
  { name: 'licence', plannedPhase: 'Phase 1 Week 4' },
  { name: 'onboarding', plannedPhase: 'Phase 1 Week 5' },
  { name: 'dashboard', plannedPhase: 'Phase 1 Week 5' },
  { name: 'session', plannedPhase: 'Phase 2 Week 7' },
  { name: 'capture', plannedPhase: 'Phase 2 Week 7' },
  { name: 'annotation', plannedPhase: 'Phase 2 Week 9' },
  { name: 'project', plannedPhase: 'Phase 1 Week 6' },
  { name: 'naming', plannedPhase: 'Phase 1 Week 4' },
  { name: 'template', plannedPhase: 'Phase 3' },
  { name: 'metrics_import', plannedPhase: 'Phase 3' },
  { name: 'report_builder', plannedPhase: 'Phase 3' },
  { name: 'export_word', plannedPhase: 'Phase 3' },
  { name: 'export_pdf', plannedPhase: 'Phase 3' },
  { name: 'export_html', plannedPhase: 'Phase 3' },
  { name: 'status_reports', plannedPhase: 'Phase 3' },
  { name: 'audit_pack', plannedPhase: 'Phase 4' },
  { name: 'sign_off', plannedPhase: 'Phase 4' },
  { name: 'settings', plannedPhase: 'Phase 1 Week 3' },
];

async function runModule(def) {
  return {
    name: def.name,
    status: 'SKIP',
    reason: `Phase 0 scaffold — not implemented yet (planned: ${def.plannedPhase})`,
    assertions: [],
    duration_ms: 0,
    plannedPhase: def.plannedPhase,
  };
}

// ─── Pre-checks (gating) ────────────────────────────────────────────────
//
// Typecheck and unit tests run before module stubs. Either failing
// promotes the overall run to exit 1 — run reports are now evidence of
// code health, not just feature progress.
// Output is recorded under `prechecks` in latest.json for history.

function runTypecheck() {
  const start = Date.now();
  try {
    execSync('npm run typecheck', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, duration_ms: Date.now() - start };
  } catch (err) {
    const out = [err.stdout, err.stderr].filter(Boolean).join('\n');
    const firstErrors = out
      .split('\n')
      .filter((l) => /error TS\d+|error:/.test(l))
      .slice(0, 10);
    return {
      ok: false,
      duration_ms: Date.now() - start,
      errors: firstErrors.length > 0 ? firstErrors : [out.slice(-800)],
    };
  }
}

function runTests() {
  const start = Date.now();
  let raw = '';
  let stderrTail = '';
  let exitOk = true;
  try {
    raw = execSync('npm test --silent -- --reporter=json', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (err) {
    exitOk = false;
    raw = (err.stdout && err.stdout.toString()) || '';
    stderrTail = ((err.stderr && err.stderr.toString()) || '').slice(-1200);
  }
  const duration_ms = Date.now() - start;

  // Extract the JSON object from vitest output (npm prepends lines).
  const jsonStart = raw.indexOf('{');
  const jsonEnd = raw.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd < 0) {
    // Usually means vitest never ran (e.g. pretest hook failed).
    // Surface the stderr tail so the real cause is visible in latest.md.
    const firstLine = stderrTail.split('\n').find((l) => /error|ERR!|failed/i.test(l)) || '';
    return {
      ok: false,
      duration_ms,
      reason: firstLine
        ? `test runner did not start — ${firstLine.trim().slice(0, 200)}`
        : 'test runner did not start (no JSON output)',
      stderr_tail: stderrTail,
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
  } catch (e) {
    return { ok: false, duration_ms, reason: `JSON parse: ${e.message}`, raw_tail: raw.slice(-800) };
  }

  const total = parsed.numTotalTests ?? 0;
  const passed = parsed.numPassedTests ?? 0;
  const failed = parsed.numFailedTests ?? 0;
  const failures = [];
  for (const f of parsed.testResults ?? []) {
    for (const a of f.assertionResults ?? []) {
      if (a.status === 'failed') {
        failures.push({
          file: path.relative(ROOT, f.name || ''),
          name: a.fullName || a.title,
          message: (a.failureMessages && a.failureMessages[0] ? a.failureMessages[0] : '').slice(0, 400),
        });
      }
    }
  }
  return { ok: exitOk && failed === 0, duration_ms, total, passed, failed, failures };
}

// ─── Dependency audit (prod only) ───────────────────────────────────────
//
// Non-blocking visibility check. Records counts from `npm audit --omit=dev`
// into every run report so severity drift is visible over time.
// Never fails the build — remediation is tracked in VULNERABILITIES.md.

function runDependencyAudit() {
  const start = Date.now();
  let raw;
  try {
    raw = execSync('npm audit --omit=dev --json', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    // npm audit exits non-zero when vulns exist; stdout still holds the JSON.
    raw = err.stdout && err.stdout.toString();
  }
  const duration_ms = Date.now() - start;
  if (!raw) {
    return { ok: false, reason: 'npm audit produced no output', duration_ms };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'npm audit output was not JSON', duration_ms };
  }
  const counts = (parsed.metadata && parsed.metadata.vulnerabilities) || {
    info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0,
  };
  return { ok: true, counts, duration_ms };
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  ensureDir(REPORTS_DIR);
  ensureDir(HISTORY_DIR);

  const started = new Date();
  const iso = started.toISOString();

  const sha = safeExec('git rev-parse HEAD', 'unknown');
  const shortSha = sha === 'unknown' ? 'nogit' : sha.slice(0, 8);
  const branch = safeExec('git rev-parse --abbrev-ref HEAD', 'unknown');

  // 1. Archive previous run (if any)
  const previous = readJSON(LATEST_JSON);
  if (previous && previous.timestamp && previous.commitSha) {
    const archiveName = `${previous.commitSha.slice(0, 8)}-${tsForPath(previous.timestamp)}`;
    const archiveDir = path.join(HISTORY_DIR, archiveName);
    ensureDir(archiveDir);
    if (fs.existsSync(LATEST_JSON)) {
      fs.copyFileSync(LATEST_JSON, path.join(archiveDir, 'latest.json'));
    }
    if (fs.existsSync(LATEST_MD)) {
      fs.copyFileSync(LATEST_MD, path.join(archiveDir, 'latest.md'));
    }
    if (fs.existsSync(CONSOLE_LOG)) {
      fs.copyFileSync(CONSOLE_LOG, path.join(archiveDir, 'console-latest.log'));
    }
  }

  // 2a. Pre-checks (gating): typecheck → tests
  const typecheck = runTypecheck();
  const tests = runTests();
  const prechecks = { typecheck, tests };

  // 2b. Run modules
  const results = [];
  const startTime = Date.now();
  for (const def of moduleDefs) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await runModule(def));
  }
  const totalDuration = Date.now() - startTime;

  const summary = {
    total_modules: results.length,
    pass: results.filter((r) => r.status === 'PASS').length,
    fail: results.filter((r) => r.status === 'FAIL').length,
    warn: results.filter((r) => r.status === 'WARN').length,
    suspect: results.filter((r) => r.status === 'SUSPECT').length,
    skip: results.filter((r) => r.status === 'SKIP').length,
  };

  const nextActions = results
    .filter((r) => r.status === 'FAIL' || r.status === 'SUSPECT')
    .map((r) => `${r.status} [${r.name}] ${r.reason ?? ''}`);

  const features = countFeatures();

  if (!typecheck.ok) {
    const first = (typecheck.errors && typecheck.errors[0]) || 'see latest.json for details';
    nextActions.unshift(`PRECHECK [typecheck] FAIL — ${first}`);
  }
  if (!tests.ok) {
    const label = tests.reason
      ? tests.reason
      : `${tests.failed}/${tests.total} failed`;
    nextActions.unshift(`PRECHECK [tests] FAIL — ${label}`);
    for (const f of (tests.failures || []).slice(0, 5)) {
      nextActions.push(`  · ${f.file} › ${f.name}`);
    }
  }

  const dependencyAudit = runDependencyAudit();
  if (dependencyAudit.ok && (dependencyAudit.counts.high > 0 || dependencyAudit.counts.critical > 0)) {
    nextActions.push(
      `DEP-AUDIT [npm audit --omit=dev] ${dependencyAudit.counts.critical} critical / ${dependencyAudit.counts.high} high / ${dependencyAudit.counts.moderate} moderate / ${dependencyAudit.counts.low} low — see VULNERABILITIES.md`
    );
  } else if (!dependencyAudit.ok) {
    nextActions.push(`DEP-AUDIT failed to run: ${dependencyAudit.reason}`);
  }

  // 3. Write latest.json
  const json = {
    timestamp: iso,
    branch,
    commitSha: sha,
    shortSha,
    nodeVersion: process.versions.node,
    electronVersion: getElectronVersion(),
    totalDurationMs: totalDuration,
    modules: results,
    summary,
    features,
    prechecks,
    dependencyAudit,
    next_actions: nextActions.length > 0 ? nextActions : ['No failures — all modules SKIP (Phase 0 scaffold).'],
  };
  fs.writeFileSync(LATEST_JSON, JSON.stringify(json, null, 2));

  // 4. Write latest.md
  const moduleRows = results
    .map((r) => `| ${r.name} | ${r.status} | ${r.plannedPhase ?? '—'} |`)
    .join('\n');

  const depAuditSection = dependencyAudit.ok
    ? [
        `| Severity | Count |`,
        `|---|---|`,
        `| critical | ${dependencyAudit.counts.critical} |`,
        `| high | ${dependencyAudit.counts.high} |`,
        `| moderate | ${dependencyAudit.counts.moderate} |`,
        `| low | ${dependencyAudit.counts.low} |`,
        `| total | ${dependencyAudit.counts.total} |`,
        ``,
        `Source: \`npm audit --omit=dev --json\`. See [VULNERABILITIES.md](../VULNERABILITIES.md) for accepted baseline and remediation plan.`,
      ]
    : [`*Dependency audit did not run: ${dependencyAudit.reason}.*`];

  const prechecksSection = [
    `| Check | Status | Duration | Notes |`,
    `|---|---|---|---|`,
    `| typecheck | ${typecheck.ok ? 'PASS' : 'FAIL'} | ${typecheck.duration_ms} ms | ${typecheck.ok ? '—' : (typecheck.errors?.[0] ?? 'see latest.json').replace(/\|/g, '\\|').slice(0, 200)} |`,
    `| tests | ${tests.ok ? 'PASS' : 'FAIL'} | ${tests.duration_ms} ms | ${tests.ok ? `${tests.passed}/${tests.total} passed` : (tests.reason ?? `${tests.failed}/${tests.total} failed`)} |`,
  ];
  if (!tests.ok && (tests.failures || []).length > 0) {
    prechecksSection.push('', '**Failing tests:**', '');
    for (const f of tests.failures.slice(0, 10)) {
      prechecksSection.push(`- \`${f.file}\` › ${f.name}`);
    }
  }

  const md = [
    `# Vision-EviDex Run Report`,
    ``,
    `**Date:** ${iso}  `,
    `**Branch:** \`${branch}\` · **Commit:** \`${shortSha}\`  `,
    `**Node:** v${process.versions.node} · **Electron:** ${json.electronVersion ?? 'n/a'}  `,
    `**Duration:** ${totalDuration} ms`,
    ``,
    `## Summary`,
    ``,
    `| Status | Count |`,
    `|--------|-------|`,
    `| PASS | ${summary.pass} |`,
    `| FAIL | ${summary.fail} |`,
    `| WARN | ${summary.warn} |`,
    `| SUSPECT | ${summary.suspect} |`,
    `| SKIP | ${summary.skip} |`,
    ``,
    `## Feature progress`,
    ``,
    `**${features.done} / ${features.total} P0 features** merged + PASS`,
    ``,
    `## Pre-checks`,
    ``,
    ...prechecksSection,
    ``,
    `## Module results`,
    ``,
    `| Module | Status | Planned phase |`,
    `|---|---|---|`,
    moduleRows,
    ``,
    `## Dependency audit (prod)`,
    ``,
    ...depAuditSection,
    ``,
    `## Next actions`,
    ``,
    ...json.next_actions.map((a) => `- ${a}`),
    ``,
  ].join('\n');

  fs.writeFileSync(LATEST_MD, md);

  // 5. Append benchmarks line
  const benchLine = JSON.stringify({
    ts: iso,
    sha: shortSha,
    branch,
    ...summary,
    features_done: features.done,
    features_total: features.total,
    duration_ms: totalDuration,
    audit: dependencyAudit.ok ? dependencyAudit.counts : null,
    typecheck: typecheck.ok,
    tests: tests.ok
      ? { ok: true, total: tests.total, passed: tests.passed }
      : { ok: false, total: tests.total ?? 0, failed: tests.failed ?? 0 },
  }) + '\n';
  fs.appendFileSync(BENCHMARKS_FILE, benchLine);

  // 6. Rewrite STATUS.md
  writeStatus({ iso, sha, shortSha, branch, json, features });

  // 7. Touch console log if missing (real capture comes from `npm run dev`)
  if (!fs.existsSync(CONSOLE_LOG)) {
    fs.writeFileSync(CONSOLE_LOG, `# console-latest.log\n# Captured from \`npm run dev\`. Populated by a wrapper script in Phase 1.\n`);
  }

  console.log(`[run-report] wrote latest.json, latest.md, STATUS.md, benchmarks.jsonl`);
  console.log(
    `[run-report] typecheck=${typecheck.ok ? 'PASS' : 'FAIL'}  tests=${tests.ok ? 'PASS' : 'FAIL'}  modules: PASS ${summary.pass}  FAIL ${summary.fail}  WARN ${summary.warn}  SKIP ${summary.skip}`
  );
  const gateFailed = summary.fail > 0 || !typecheck.ok || !tests.ok;
  process.exit(gateFailed ? 1 : 0);
}

function writeStatus({ iso, shortSha, branch, json, features }) {
  const byMod = features.byModule;
  const getMod = (code) => `${byMod[code]?.done ?? 0} / ${byMod[code]?.total ?? 0}`;
  const content = [
    `<!--`,
    `  STATUS.md — auto-rewritten by \`npm run report\` on the Asus TUF.`,
    `  Do not hand-edit. Merge conflicts resolved by merge=ours (Asus wins).`,
    `  For cross-machine messages, use INBOX-TO-ASUS.md and INBOX-TO-CTS.md.`,
    `-->`,
    ``,
    `# Vision-EviDex — Live Status`,
    ``,
    `| Field | Value |`,
    `|---|---|`,
    `| Last Asus run | ${iso} |`,
    `| Last run commit | \`${shortSha}\` |`,
    `| Last run branch | \`${branch}\` |`,
    `| Node | v${json.nodeVersion} |`,
    `| Electron | ${json.electronVersion ?? 'n/a'} |`,
    `| Run duration | ${json.totalDurationMs} ms |`,
    ``,
    `## Module results`,
    ``,
    `| Status | Count |`,
    `|---|---|`,
    `| PASS | ${json.summary.pass} |`,
    `| FAIL | ${json.summary.fail} |`,
    `| WARN | ${json.summary.warn} |`,
    `| SUSPECT | ${json.summary.suspect} |`,
    `| SKIP | ${json.summary.skip} |`,
    ``,
    `## Feature progress`,
    ``,
    `**${features.done} / ${features.total}** P0 features merged + PASS`,
    ``,
    `| Module | Done / Total |`,
    `|---|---|`,
    `| OB Onboarding & Licence | ${getMod('OB')} |`,
    `| DB Dashboard | ${getMod('DB')} |`,
    `| EC Evidence Capture | ${getMod('EC')} |`,
    `| PM Project Manager | ${getMod('PM')} |`,
    `| TE Template Engine | ${getMod('TE')} |`,
    `| RB Report Builder | ${getMod('RB')} |`,
    `| SR Status Reports | ${getMod('SR')} |`,
    `| AU Audit Pack | ${getMod('AU')} |`,
    `| WS Workspace Settings | ${getMod('WS')} |`,
    ``,
    `See [FEATURES.md](FEATURES.md) for the full checklist.`,
    ``,
    `## Open items`,
    ``,
    `### FAIL (must fix before new feature work)`,
    ``,
    json.next_actions.length > 0 && json.summary.fail > 0
      ? json.next_actions.map((a) => `- ${a}`).join('\n')
      : '*No FAIL items.*',
    ``,
    `### Next actions`,
    ``,
    json.next_actions.map((a) => `- ${a}`).join('\n'),
    ``,
    `## Links`,
    ``,
    `- Full report: [run-reports/latest.md](run-reports/latest.md)`,
    `- Machine-readable: [run-reports/latest.json](run-reports/latest.json)`,
    `- Run history: [run-reports/history/](run-reports/history/)`,
    `- Benchmarks trend: [run-reports/benchmarks.jsonl](run-reports/benchmarks.jsonl)`,
    `- Messages to Asus: [INBOX-TO-ASUS.md](INBOX-TO-ASUS.md)`,
    `- Messages to CTS: [INBOX-TO-CTS.md](INBOX-TO-CTS.md)`,
    ``,
  ].join('\n');
  fs.writeFileSync(STATUS_MD, content);
}

main().catch((err) => {
  console.error('[run-report] failed:', err);
  process.exit(2);
});
