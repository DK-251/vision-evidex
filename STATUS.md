<!--
  STATUS.md — auto-rewritten by `npm run report` on the Asus TUF.
  Do not hand-edit. Merge conflicts resolved by merge=ours (Asus wins).
  For cross-machine messages, use INBOX-TO-ASUS.md and INBOX-TO-CTS.md.
-->

# Vision-EviDex — Live Status

| Field | Value |
|---|---|
| Last Asus run | 2026-05-05T07:22:31.496Z |
| Last run commit | `42e02915` |
| Last run branch | `main` |
| Node | v22.22.2 |
| Electron | ^30.4.0 |
| Run duration | 0 ms |

## Module results

| Status | Count |
|---|---|
| PASS | 0 |
| FAIL | 0 |
| WARN | 0 |
| SUSPECT | 0 |
| SKIP | 18 |

## Feature progress

**0 / 92** P0 features merged + PASS

| Module | Done / Total |
|---|---|
| OB Onboarding & Licence | 0 / 13 |
| DB Dashboard | 0 / 5 |
| EC Evidence Capture | 0 / 17 |
| PM Project Manager | 0 / 10 |
| TE Template Engine | 0 / 11 |
| RB Report Builder | 0 / 13 |
| SR Status Reports | 0 / 4 |
| AU Audit Pack | 0 / 7 |
| WS Workspace Settings | 0 / 12 |

See [FEATURES.md](FEATURES.md) for the full checklist.

## Open items

### FAIL (must fix before new feature work)

*No FAIL items.*

### Next actions

- PRECHECK [tests] FAIL — 2/327 failed
- PRECHECK [typecheck] FAIL — src/main/ipc-router.ts(128,29): error TS2379: Argument of type '{ projectId: string; testId: string; testName: string; environment: string; testerName: string; applicationUnderTest: string; testDataMatrix?: string | undefined; scenario?: string | undefined; requirementId?: string | undefined; requirementDesc?: string | undefined; testerEmail?: string | undefined; }' is not assignable to parameter of type 'SessionIntakeInput' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
-   · __tests__\integration.session-lifecycle.spec.ts › Session lifecycle integration end() skips container.save when no container is open (no throw — pre-Wk8 mode)
-   · __tests__\ipc-router.spec.ts › ipc-router (Phase 1 Wk3 security gate) accepts a valid session:create payload and returns stub null
- DEP-AUDIT [npm audit --omit=dev] 0 critical / 5 high / 0 moderate / 3 low — see VULNERABILITIES.md

## Links

- Full report: [run-reports/latest.md](run-reports/latest.md)
- Machine-readable: [run-reports/latest.json](run-reports/latest.json)
- Run history: [run-reports/history/](run-reports/history/)
- Benchmarks trend: [run-reports/benchmarks.jsonl](run-reports/benchmarks.jsonl)
- Messages to Asus: [INBOX-TO-ASUS.md](INBOX-TO-ASUS.md)
- Messages to CTS: [INBOX-TO-CTS.md](INBOX-TO-CTS.md)
