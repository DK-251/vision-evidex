# Vision-EviDex Run Report

**Date:** 2026-05-12T06:50:35.221Z  
**Branch:** `main` · **Commit:** `0b586a93`  
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

**49 / 92 P0 features** merged + PASS

## Pre-checks

| Check | Status | Duration | Notes |
|---|---|---|---|
| typecheck | FAIL | 12983 ms | src/annotation/App.tsx(248,19): error TS2352: Conversion of type '{ readonly session: { readonly create: (input: SessionIntakeInput) => Promise<IpcResult<Session>>; readonly end: (sessionId: string) = |
| tests | FAIL | 19988 ms | 1/537 failed |

**Failing tests:**

- `__tests__\ipc-router.spec.ts` › ipc-router (Phase 1 Wk3 security gate) registers every IPC invoke channel

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
| PBKDF2 (310k iter, SHA-256) | 145.42 ms | 149.21 ms | 153.99 ms | 800 ms | PASS |

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

- PRECHECK [tests] FAIL — 1/537 failed
- PRECHECK [typecheck] FAIL — src/annotation/App.tsx(248,19): error TS2352: Conversion of type '{ readonly session: { readonly create: (input: SessionIntakeInput) => Promise<IpcResult<Session>>; readonly end: (sessionId: string) => Promise<IpcResult<SessionSummary>>; readonly get: (sessionId: string) => Promise<IpcResult<Session | null>>; readonly list: (projectId: string) => Promise<IpcResult<Session[]>>; }; ...' to type '{ capture?: { saveAnnotation?: (r: { captureId: string; fabricCanvasJson: object; compositeBuffer: string; blurRegions: BlurRegion[]; }) => Promise<{ ok: boolean; error?: { message: string; }; }>; }; }' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
-   · __tests__\ipc-router.spec.ts › ipc-router (Phase 1 Wk3 security gate) registers every IPC invoke channel
- DEP-AUDIT [npm audit --omit=dev] 0 critical / 5 high / 0 moderate / 3 low — see VULNERABILITIES.md
