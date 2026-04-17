<!--
  STATUS.md — auto-rewritten by `npm run report` on the Asus TUF.
  Do not hand-edit on the CTS laptop. Merge conflicts resolved by merge=ours
  (Asus version wins). For cross-machine messages, use INBOX-TO-ASUS.md and
  INBOX-TO-CTS.md instead.
-->

# Vision-EviDex — Live Status

| Field | Value |
|---|---|
| Phase | 0 (scaffold) |
| Sprint | Week 1 — Environment setup and project scaffold |
| Last Asus run | *never* — no run report yet |
| Last run commit | *none* |
| Last run branch | — |
| Node version | — |
| Electron version | — |

## Module results (latest run)

| Status | Count |
|---|---|
| PASS | 0 |
| FAIL | 0 |
| WARN | 0 |
| SUSPECT | 0 |
| SKIP | 18 |

## Feature progress

**0 / 92 P0 features merged + run-report PASS.** See [FEATURES.md](FEATURES.md) for the module-level checklist.

## Open items

### FAIL (must fix before new feature work)

*None — no run yet.*

### User action needed

- Install prerequisites on the Asus TUF (Node 22 LTS, VS Build Tools, Git). See [ASUS-FIRST-RUN.md](ASUS-FIRST-RUN.md).
- Generate `EVIDEX_APP_SECRET` on CTS and store in Windows System Environment Variables + password manager.
- Run `scripts\setup-asus.ps1` on the Asus TUF and produce the first real run report.

## Cross-machine messages

- CTS → Asus: [INBOX-TO-ASUS.md](INBOX-TO-ASUS.md)
- Asus → CTS: [INBOX-TO-CTS.md](INBOX-TO-CTS.md)

## History

Archived run reports: [run-reports/history/](run-reports/history/)
Benchmark trend: [run-reports/benchmarks.jsonl](run-reports/benchmarks.jsonl)
