/* eslint-disable no-console */
/**
 * Vision-EviDex — run-report.js
 *
 * Generates run-reports/latest.json (machine-readable) and
 * run-reports/latest.md (human-readable) after a test run on the Asus TUF.
 * Claude Code reads latest.md at the start of every CTS coding session.
 *
 *   npm run report
 *
 * Phase 0 skeleton — each module currently returns SKIP with a planned
 * phase tag. Full assertions arrive per sprint as modules land.
 */

const fs = require('node:fs');
const path = require('node:path');

const OUT_DIR = path.resolve(__dirname, '..', 'run-reports');
fs.mkdirSync(OUT_DIR, { recursive: true });

const modules = [
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

async function runModule(mod) {
  return {
    name: mod.name,
    status: 'SKIP',
    reason: `Phase 0 scaffold — module not implemented yet (planned: ${mod.plannedPhase})`,
    assertions: [],
    duration_ms: 0,
  };
}

async function main() {
  const started = new Date();
  const results = [];
  for (const mod of modules) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await runModule(mod));
  }

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

  const json = {
    timestamp: started.toISOString(),
    branch: process.env.GIT_BRANCH ?? 'unknown',
    nodeVersion: process.versions.node,
    electronVersion: null,
    modules: results,
    summary,
    next_actions: nextActions.length > 0 ? nextActions : ['No failures — all modules SKIP (Phase 0 scaffold)'],
  };

  fs.writeFileSync(path.join(OUT_DIR, 'latest.json'), JSON.stringify(json, null, 2));

  const md = [
    `# Vision-EviDex Run Report`,
    ``,
    `**Date:** ${started.toISOString().slice(0, 10)} · **Node:** v${process.versions.node}`,
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
    `## Module Results`,
    ``,
    ...results.map((r) => `### ${r.name} — ${r.status}\n\n${r.reason ?? ''}\n`),
    ``,
    `## Next Actions`,
    ``,
    ...json.next_actions.map((a) => `- ${a}`),
    ``,
  ].join('\n');

  fs.writeFileSync(path.join(OUT_DIR, 'latest.md'), md);

  console.log(`Wrote ${OUT_DIR}/latest.json and latest.md`);
  process.exit(summary.fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('run-report failed:', err);
  process.exit(2);
});
