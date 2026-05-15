# Vision-EviDex Run Report

**Date:** 2026-05-15T08:42:58.303Z  
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
| typecheck | FAIL | 9287 ms | src/renderer/pages/SessionGalleryPage.tsx(116,24): error TS2448: Block-scoped variable 'displayCaptures' used before its declaration. |
| tests | FAIL | 14801 ms | 24/563 failed |

**Failing tests:**

- `__tests__\hotkey-utils.spec.ts` › formatKeyEvent orders modifiers Ctrl+Alt+Shift+Meta
- `__tests__\integration.project-roundtrip.spec.ts` › Phase 2 Wk 8 — full project round-trip create project → start session → capture (mocked) → end session — every Wk 8 contract holds
- `__tests__\integration.session-lifecycle.spec.ts` › Session lifecycle integration create() inserts a session record retrievable via DatabaseService
- `__tests__\integration.session-lifecycle.spec.ts` › Session lifecycle integration create() session has endedAt undefined (active per AQ3)
- `__tests__\integration.session-lifecycle.spec.ts` › Session lifecycle integration create() registers global shortcuts via the (mocked) globalShortcut module
- `__tests__\integration.session-lifecycle.spec.ts` › Session lifecycle integration create() calls windows.showToolbar with the new session
- `__tests__\integration.session-lifecycle.spec.ts` › Session lifecycle integration create() writes a session_start access_log row
- `__tests__\integration.session-lifecycle.spec.ts` › Session lifecycle integration end() closes the session in the DB (endedAt becomes a string)
- `__tests__\integration.session-lifecycle.spec.ts` › Session lifecycle integration end() unregisters global shortcuts (CLAUDE.md hotkey-release rule)
- `__tests__\integration.session-lifecycle.spec.ts` › Session lifecycle integration end() invokes container.save() — Architectural Rule 8

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
| PBKDF2 (310k iter, SHA-256) | 93.1 ms | 95.04 ms | 97.5 ms | 800 ms | PASS |

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

- PRECHECK [tests] FAIL — 24/563 failed
- PRECHECK [typecheck] FAIL — src/renderer/pages/SessionGalleryPage.tsx(116,24): error TS2448: Block-scoped variable 'displayCaptures' used before its declaration.
-   · __tests__\hotkey-utils.spec.ts › formatKeyEvent orders modifiers Ctrl+Alt+Shift+Meta
-   · __tests__\integration.project-roundtrip.spec.ts › Phase 2 Wk 8 — full project round-trip create project → start session → capture (mocked) → end session — every Wk 8 contract holds
-   · __tests__\integration.session-lifecycle.spec.ts › Session lifecycle integration create() inserts a session record retrievable via DatabaseService
-   · __tests__\integration.session-lifecycle.spec.ts › Session lifecycle integration create() session has endedAt undefined (active per AQ3)
-   · __tests__\integration.session-lifecycle.spec.ts › Session lifecycle integration create() registers global shortcuts via the (mocked) globalShortcut module
- DEP-AUDIT [npm audit --omit=dev] 0 critical / 5 high / 0 moderate / 3 low — see VULNERABILITIES.md
