# Vision-EviDex Run Report

**Date:** 2026-05-08T16:35:19.444Z  
**Branch:** `main` · **Commit:** `d5ebe103`  
**Node:** v22.22.2 · **Electron:** ^30.4.0  
**Duration:** 1 ms

## Summary

| Status | Count |
|--------|-------|
| PASS | 0 |
| FAIL | 0 |
| WARN | 0 |
| SUSPECT | 0 |
| SKIP | 18 |

## Feature progress

**3 / 92 P0 features** merged + PASS

## Pre-checks

| Check | Status | Duration | Notes |
|---|---|---|---|
| typecheck | PASS | 8610 ms | — |
| tests | FAIL | 12923 ms | 16/453 failed |

**Failing tests:**

- `__tests__\database-service.spec.ts` › DatabaseService — app.db upsertRecentProject inserts then updates the same projectId
- `__tests__\database-service.spec.ts` › DatabaseService — app.db orders recent projects by lastOpenedAt DESC
- `__tests__\metrics-service.spec.ts` › MetricsService reflects recent_projects count in activeProjects
- `__tests__\metrics-service.spec.ts` › MetricsService session / capture / export counters are placeholder zeros until Phase 2+
- `__tests__\pre-w9-gap-coverage.spec.ts` › NamingService — additional boundary cases project name with all special chars produces underscores only
- `__tests__\pre-w9-gap-coverage.spec.ts` › IPC Schemas — additional boundary cases CaptureRequestSchema — all mode combinations accepts region with fractional coordinates
- `__tests__\pre-w9-gap-coverage.spec.ts` › useSessionStore — capture subscription lifecycle (GAP-S1) startSession subscribes to onCaptureArrived
- `__tests__\pre-w9-gap-coverage.spec.ts` › useSessionStore — capture subscription lifecycle (GAP-S1) clearSession calls the unsubscribe function
- `__tests__\pre-w9-gap-coverage.spec.ts` › useSessionStore — capture subscription lifecycle (GAP-S1) clearSession sets _captureListener to null
- `__tests__\pre-w9-gap-coverage.spec.ts` › useSessionStore — capture subscription lifecycle (GAP-S1) no subscription when startSession fails (ok:false)

## Module results

| Module | Status | Planned phase |
|---|---|---|
| licence | SKIP | Phase 1 Week 4 |
| onboarding | SKIP | Phase 1 Week 5 |
| dashboard | SKIP | Phase 1 Week 5 |
| session | SKIP | Phase 2 Week 7 |
| capture | SKIP | Phase 2 Week 7 |
| annotation | SKIP | Phase 2 Week 9 |
| project | SKIP | Phase 1 Week 6 |
| naming | SKIP | Phase 1 Week 4 |
| template | SKIP | Phase 3 |
| metrics_import | SKIP | Phase 3 |
| report_builder | SKIP | Phase 3 |
| export_word | SKIP | Phase 3 |
| export_pdf | SKIP | Phase 3 |
| export_html | SKIP | Phase 3 |
| status_reports | SKIP | Phase 3 |
| audit_pack | SKIP | Phase 4 |
| sign_off | SKIP | Phase 4 |
| settings | SKIP | Phase 1 Week 3 |

## Benchmarks

| Benchmark | min | mean | max | budget | Status |
|---|---|---|---|---|---|
| PBKDF2 (310k iter, SHA-256) | 90.53 ms | 91.47 ms | 92.91 ms | 800 ms | PASS |

Risk R-07 — history in [sprint0-benchmark.json](sprint0-benchmark.json).

## Dependency audit (prod)

| Severity | Count |
|---|---|
| critical | 0 |
| high | 5 |
| moderate | 0 |
| low | 3 |
| total | 8 |

Source: `npm audit --omit=dev --json`. See [VULNERABILITIES.md](../VULNERABILITIES.md) for accepted baseline and remediation plan.

## Next actions

- PRECHECK [tests] FAIL — 16/453 failed
-   · __tests__\database-service.spec.ts › DatabaseService — app.db upsertRecentProject inserts then updates the same projectId
-   · __tests__\database-service.spec.ts › DatabaseService — app.db orders recent projects by lastOpenedAt DESC
-   · __tests__\metrics-service.spec.ts › MetricsService reflects recent_projects count in activeProjects
-   · __tests__\metrics-service.spec.ts › MetricsService session / capture / export counters are placeholder zeros until Phase 2+
-   · __tests__\pre-w9-gap-coverage.spec.ts › NamingService — additional boundary cases project name with all special chars produces underscores only
- DEP-AUDIT [npm audit --omit=dev] 0 critical / 5 high / 0 moderate / 3 low — see VULNERABILITIES.md
