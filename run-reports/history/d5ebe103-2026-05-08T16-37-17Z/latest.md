# Vision-EviDex Run Report

**Date:** 2026-05-08T16:37:17.615Z  
**Branch:** `main` · **Commit:** `d5ebe103`  
**Node:** v22.22.2 · **Electron:** ^30.4.0  
**Duration:** 0 ms

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
| typecheck | PASS | 8789 ms | — |
| tests | FAIL | 10777 ms | 12/453 failed |

**Failing tests:**

- `__tests__\pre-w9-gap-coverage.spec.ts` › NamingService — additional boundary cases project name with all special chars produces underscores only
- `__tests__\pre-w9-gap-coverage.spec.ts` › IPC Schemas — additional boundary cases CaptureRequestSchema — all mode combinations accepts region with fractional coordinates
- `__tests__\pre-w9-gap-coverage.spec.ts` › useSessionStore — capture subscription lifecycle (GAP-S1) startSession subscribes to onCaptureArrived
- `__tests__\pre-w9-gap-coverage.spec.ts` › useSessionStore — capture subscription lifecycle (GAP-S1) clearSession calls the unsubscribe function
- `__tests__\pre-w9-gap-coverage.spec.ts` › useSessionStore — capture subscription lifecycle (GAP-S1) clearSession sets _captureListener to null
- `__tests__\pre-w9-gap-coverage.spec.ts` › useSessionStore — capture subscription lifecycle (GAP-S1) no subscription when startSession fails (ok:false)
- `__tests__\pre-w9-gap-coverage.spec.ts` › useProjectStore — isLoading and edge cases (GAP-S2) loadRecent sets isLoading:true then false on success
- `__tests__\pre-w9-gap-coverage.spec.ts` › useProjectStore — isLoading and edge cases (GAP-S2) loadRecent sets isLoading:false even on failure
- `__tests__\pre-w9-gap-coverage.spec.ts` › useProjectStore — isLoading and edge cases (GAP-S2) createProject sets isLoading:false even when IPC fails
- `__tests__\pre-w9-gap-coverage.spec.ts` › useProjectStore — isLoading and edge cases (GAP-S2) clear() resets everything to initial state

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
| PBKDF2 (310k iter, SHA-256) | 90.32 ms | 91 ms | 92 ms | 800 ms | PASS |

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

- PRECHECK [tests] FAIL — 12/453 failed
-   · __tests__\pre-w9-gap-coverage.spec.ts › NamingService — additional boundary cases project name with all special chars produces underscores only
-   · __tests__\pre-w9-gap-coverage.spec.ts › IPC Schemas — additional boundary cases CaptureRequestSchema — all mode combinations accepts region with fractional coordinates
-   · __tests__\pre-w9-gap-coverage.spec.ts › useSessionStore — capture subscription lifecycle (GAP-S1) startSession subscribes to onCaptureArrived
-   · __tests__\pre-w9-gap-coverage.spec.ts › useSessionStore — capture subscription lifecycle (GAP-S1) clearSession calls the unsubscribe function
-   · __tests__\pre-w9-gap-coverage.spec.ts › useSessionStore — capture subscription lifecycle (GAP-S1) clearSession sets _captureListener to null
- DEP-AUDIT [npm audit --omit=dev] 0 critical / 5 high / 0 moderate / 3 low — see VULNERABILITIES.md
