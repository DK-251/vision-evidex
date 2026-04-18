#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Risk R-07 measurement — PBKDF2 key derivation must complete in under
 * 800 ms on the Asus TUF target hardware, otherwise the container open
 * / save UX stalls perceptibly.
 *
 * Exported for `run-report.js` (writes the measurement every run) and
 * usable standalone via `npm run bench:pbkdf2`.
 */

const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, pbkdf2Sync } = require('node:crypto');

const ITERATIONS = 310_000;
const KEY_LEN = 32;
const SALT_LEN = 16;
const DEFAULT_RUNS = 5;
const BUDGET_MS = 800;

const ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(ROOT, 'run-reports', 'sprint0-benchmark.json');

function sampleOnce() {
  const salt = randomBytes(SALT_LEN);
  const t0 = process.hrtime.bigint();
  pbkdf2Sync('unit-test-password', salt, ITERATIONS, KEY_LEN, 'sha256');
  const t1 = process.hrtime.bigint();
  return Number(t1 - t0) / 1_000_000;
}

function runBenchmark({ runs = DEFAULT_RUNS, persist = false } = {}) {
  // Warm-up sample excluded — first call pays JIT + module init.
  sampleOnce();
  const samples = [];
  for (let i = 0; i < runs; i++) samples.push(sampleOnce());
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const record = {
    ts: new Date().toISOString(),
    node: process.versions.node,
    platform: `${process.platform}-${process.arch}`,
    iterations: ITERATIONS,
    key_len_bytes: KEY_LEN,
    salt_len_bytes: SALT_LEN,
    runs,
    samples_ms: samples.map((n) => Number(n.toFixed(2))),
    min_ms: Number(min.toFixed(2)),
    max_ms: Number(max.toFixed(2)),
    mean_ms: Number(mean.toFixed(2)),
    budget_ms: BUDGET_MS,
    passed: max < BUDGET_MS,
  };
  if (persist) appendHistory(record);
  return record;
}

function appendHistory(record) {
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  let history = [];
  if (fs.existsSync(OUT_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
      if (Array.isArray(parsed)) history = parsed;
    } catch {
      /* fall through to fresh history */
    }
  }
  history.push(record);
  fs.writeFileSync(OUT_PATH, JSON.stringify(history, null, 2));
}

module.exports = { runBenchmark, BUDGET_MS, OUT_PATH };

if (require.main === module) {
  const record = runBenchmark({ persist: true });
  console.log(
    `[pbkdf2-bench] min=${record.min_ms}ms  mean=${record.mean_ms}ms  max=${record.max_ms}ms  budget=${BUDGET_MS}ms  ${record.passed ? 'PASS' : 'FAIL'}`
  );
  process.exit(record.passed ? 0 : 1);
}
