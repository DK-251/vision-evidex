# VULNERABILITIES — Vision-EviDex

Snapshot from Asus TUF first-run setup on 2026-04-18.

## Current audit summary

- Command used: `npm audit --omit=dev`
- Result: 8 vulnerabilities total (3 low, 5 high)
- Current status: not blocking Phase 0 scaffold run, but must be tracked before enabling Phase 3 features and before release builds.

## Findings

1. `xlsx` (high)
- Advisory: prototype pollution and ReDoS
- Fix status: no upstream fix available in current audit output
- Project impact: Metrics import service is still a Phase 3 stub, so this path is not active yet.

2. `tar` chain via `canvas`/`@mapbox/node-pre-gyp` (high)
- Advisory class: path traversal and arbitrary overwrite/read risks during archive extraction paths in vulnerable versions
- Fix path from npm audit: requires force upgrade that also pulls breaking dependency changes

3. `@tootallnate/once` via `http-proxy-agent`/`jsdom` chain (low/high mixed chain)
- Advisory: incorrect control flow scoping
- Current suggested fix: `npm audit fix --force` would upgrade `fabric` to 7.x

## Guardrails for this repo

- Do NOT run `npm audit fix --force` in this branch now.
- `fabric` must remain pinned to `5.3.0` per architecture lock.
- Track and resolve vulnerabilities as a planned security task, not as a blind force-upgrade.

## Required follow-up (CTS)

1. Create a security backlog item for Phase 3 dependency strategy (`xlsx`, `canvas/tar` chain).
2. Evaluate alternatives for metrics import parsing if `xlsx` remains unpatched.
3. Add CI visibility step (`npm audit --omit=dev`) and fail only on agreed severity thresholds.
4. Re-audit before enabling Metrics Import in implementation.

## Validation context

- `npm run verify-setup`: PASS
- `npm run dev`: Electron shell boots; scaffold state is healthy
- `npm run report`: PASS 0 / FAIL 0 / SKIP 18 (expected for Phase 0)
