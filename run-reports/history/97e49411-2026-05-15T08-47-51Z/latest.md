# Vision-EviDex Run Report

**Date:** 2026-05-15T08:47:51.288Z  
**Branch:** `main` · **Commit:** `97e49411`  
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

**49 / 92 P0 features** merged + PASS

## Pre-checks

| Check | Status | Duration | Notes |
|---|---|---|---|
| typecheck | FAIL | 8958 ms | src/toolbar/App.tsx(116,17): error TS2345: Argument of type '{ sessionId: string; testId: string \| undefined; captureCount: number; passCount: number; failCount: number; blockedCount: number; }' is n |
| tests | FAIL | 13934 ms | 5/563 failed |

**Failing tests:**

- `__tests__\pre-w9-gap-coverage.spec.ts` › useNavStore — param clearing on navigate (PRE-W9 fix) navigating to project-list clears currentSessionId
- `__tests__\session-service.spec.ts` › SessionService — lifecycle (Phase 2 Wk7 / D33) create() inserts a session row, logs access_log, registers shortcuts, shows toolbar
- `__tests__\session-service.spec.ts` › SessionService — lifecycle (Phase 2 Wk7 / D33) create() rolls the DB row back to closed if shortcut registration fails
- `__tests__\session-service.spec.ts` › SessionService — lifecycle (Phase 2 Wk7 / D33) create() resolves hotkeys from settings.hotkeys, falling back to defaults per missing key
- `__tests__\session-service.spec.ts` › SessionService — lifecycle (Phase 2 Wk7 / D33) end() unregisters shortcuts AND calls container.save (Rule 8)

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
| PBKDF2 (310k iter, SHA-256) | 91.78 ms | 92.47 ms | 93.36 ms | 800 ms | PASS |

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

- PRECHECK [tests] FAIL — 5/563 failed
- PRECHECK [typecheck] FAIL — src/toolbar/App.tsx(116,17): error TS2345: Argument of type '{ sessionId: string; testId: string | undefined; captureCount: number; passCount: number; failCount: number; blockedCount: number; }' is not assignable to parameter of type 'SetStateAction<ToolbarStatus | null>'.
-   · __tests__\pre-w9-gap-coverage.spec.ts › useNavStore — param clearing on navigate (PRE-W9 fix) navigating to project-list clears currentSessionId
-   · __tests__\session-service.spec.ts › SessionService — lifecycle (Phase 2 Wk7 / D33) create() inserts a session row, logs access_log, registers shortcuts, shows toolbar
-   · __tests__\session-service.spec.ts › SessionService — lifecycle (Phase 2 Wk7 / D33) create() rolls the DB row back to closed if shortcut registration fails
-   · __tests__\session-service.spec.ts › SessionService — lifecycle (Phase 2 Wk7 / D33) create() resolves hotkeys from settings.hotkeys, falling back to defaults per missing key
-   · __tests__\session-service.spec.ts › SessionService — lifecycle (Phase 2 Wk7 / D33) end() unregisters shortcuts AND calls container.save (Rule 8)
- DEP-AUDIT [npm audit --omit=dev] 0 critical / 5 high / 0 moderate / 3 low — see VULNERABILITIES.md
