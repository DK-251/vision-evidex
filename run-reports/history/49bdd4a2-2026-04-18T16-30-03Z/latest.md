# Vision-EviDex Run Report

**Date:** 2026-04-18T16:30:03.385Z  
**Branch:** `main` · **Commit:** `49bdd4a2`  
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
| typecheck | FAIL | 7955 ms | src/main/ipc-router.ts(171,43): error TS2379: Argument of type '{ brandingProfileId?: string; hotkeys?: Record<string, string>; profile?: { name: string; role: string; team?: string \| undefined; emai |
| tests | PASS | 14244 ms | 189/189 passed |

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
| PBKDF2 (310k iter, SHA-256) | 141.99 ms | 146.57 ms | 153.16 ms | 800 ms | PASS |

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

- PRECHECK [typecheck] FAIL — src/main/ipc-router.ts(171,43): error TS2379: Argument of type '{ brandingProfileId?: string; hotkeys?: Record<string, string>; profile?: { name: string; role: string; team?: string | undefined; email?: string | undefined; }; defaultTemplateId?: string; defaultStoragePath?: string; theme?: "light" | ... 1 more ... | "system"; onboardingComplete?: boolean; }' is not assignable to parameter of type 'Partial<Settings>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
- DEP-AUDIT [npm audit --omit=dev] 0 critical / 5 high / 0 moderate / 3 low — see VULNERABILITIES.md
