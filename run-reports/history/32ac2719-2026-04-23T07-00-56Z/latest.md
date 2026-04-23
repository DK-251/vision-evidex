# Vision-EviDex Run Report

**Date:** 2026-04-23T07:00:56.791Z  
**Branch:** `main` · **Commit:** `32ac2719`  
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

**0 / 92 P0 features** merged + PASS

## Pre-checks

| Check | Status | Duration | Notes |
|---|---|---|---|
| typecheck | PASS | 7660 ms | — |
| tests | FAIL | 8263 ms | 10/203 failed |

**Failing tests:**

- `__tests__\capture-service.spec.ts` › CaptureService — 9-step pipeline (Phase 2 Wk7 / D32) returns a CaptureResult whose sha256 matches the RAW buffer (hash BEFORE compression)
- `__tests__\capture-service.spec.ts` › CaptureService — 9-step pipeline (Phase 2 Wk7 / D32) returns fileSizeBytes that is smaller than the raw framebuffer (compression ran)
- `__tests__\capture-service.spec.ts` › CaptureService — 9-step pipeline (Phase 2 Wk7 / D32) emits a base64 JPEG thumbnail data URL
- `__tests__\capture-service.spec.ts` › CaptureService — 9-step pipeline (Phase 2 Wk7 / D32) inserts a capture row whose sha256 matches the manifest entry
- `__tests__\capture-service.spec.ts` › CaptureService — 9-step pipeline (Phase 2 Wk7 / D32) writes the compressed image into the container BEFORE appending the manifest (persist-then-manifest)
- `__tests__\capture-service.spec.ts` › CaptureService — 9-step pipeline (Phase 2 Wk7 / D32) fires onFlash AFTER persistence (step 9 runs last)
- `__tests__\capture-service.spec.ts` › CaptureService — 9-step pipeline (Phase 2 Wk7 / D32) defaults statusTag to "untagged" when input omits it
- `__tests__\capture-service.spec.ts` › CaptureService — 9-step pipeline (Phase 2 Wk7 / D32) respects an explicit statusTag from input
- `__tests__\capture-service.spec.ts` › CaptureService — 9-step pipeline (Phase 2 Wk7 / D32) passes the region through to the capture source for region mode
- `__tests__\capture-service.spec.ts` › CaptureService — 9-step pipeline (Phase 2 Wk7 / D32) generates a deterministic filename from the session naming context

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
| PBKDF2 (310k iter, SHA-256) | 92.38 ms | 92.46 ms | 92.59 ms | 800 ms | PASS |

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

- PRECHECK [tests] FAIL — 10/203 failed
-   · __tests__\capture-service.spec.ts › CaptureService — 9-step pipeline (Phase 2 Wk7 / D32) returns a CaptureResult whose sha256 matches the RAW buffer (hash BEFORE compression)
-   · __tests__\capture-service.spec.ts › CaptureService — 9-step pipeline (Phase 2 Wk7 / D32) returns fileSizeBytes that is smaller than the raw framebuffer (compression ran)
-   · __tests__\capture-service.spec.ts › CaptureService — 9-step pipeline (Phase 2 Wk7 / D32) emits a base64 JPEG thumbnail data URL
-   · __tests__\capture-service.spec.ts › CaptureService — 9-step pipeline (Phase 2 Wk7 / D32) inserts a capture row whose sha256 matches the manifest entry
-   · __tests__\capture-service.spec.ts › CaptureService — 9-step pipeline (Phase 2 Wk7 / D32) writes the compressed image into the container BEFORE appending the manifest (persist-then-manifest)
- DEP-AUDIT [npm audit --omit=dev] 0 critical / 5 high / 0 moderate / 3 low — see VULNERABILITIES.md
