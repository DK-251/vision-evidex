# BACKLOG — Vision-EviDex

Ideas, enhancements, and discovered work that doesn't fit in the current sprint. Add an entry whenever something comes up mid-work that shouldn't derail the task at hand.

**Format:** `YYYY-MM-DD · [SPRINT-DISCOVERED] · IDEA · PRIORITY · NOTES`

---

| Date | Sprint | Idea | Priority | Notes |
|---|---|---|---|---|
| 2026-04-18 | Phase 0 | Security remediation plan for npm audit findings (`xlsx`, `canvas/tar` chain) | P1 | `npm audit --omit=dev` reports 8 vulns (5 high). Do not run `npm audit fix --force` because it breaks locked `fabric@5.3.0`. Track mitigation before Phase 3 metrics import implementation and before release hardening. |
| 2026-04-18 | Phase 0 | Phase 1 Week 3 security gate — IPC validation integration test | P1 | Before first IPC handler merges, add a vitest integration test that invokes a handler with invalid payload and asserts it returns `IpcResult` `{ok:false, error.code:'VALIDATION_FAILED'}` rather than throwing. Covers architectural rules #2 and #3 from CLAUDE.md. |
| 2026-04-18 | Phase 0 | Phase 1 Week 4 security gate — crypto & SQL audit | P1 | When `EvidexContainerService` (AES-256-GCM) and `DatabaseService` land, audit: random IV per encrypt, auth-tag verification on decrypt, documented PBKDF2 iteration count, and that every SQL call uses `db.prepare(...)` with bound params (rule #4). Block merge until reviewed. |
| 2026-04-18 | Phase 0 | Phase 2 Week 9 / Phase 3 security gate — fabric SVG XSS decision point | P2 | Before any fabric `.toSVG()` path ships (annotation export / HTML export), either sanitize SVG output or re-open the `fabric@5.3.0` pin decision against advisory GHSA-hfvx-25r5-qc3w (CVSS 7.6). Current reachability is zero; becomes reachable the moment annotation export lands. |
| 2026-04-17 | Phase 0 | Resolve CTS corporate SSL cert for node-gyp | P2 | Currently a Phase 0 open item. Asus TUF covers builds, so not blocking. Fix when someone wants to run `npm run dev` on CTS. |
| 2026-04-17 | Phase 0 | Ship bundled Inter font files | P1 | Tokens reference `var(--font-sans)` which falls back to system-ui. Add `Inter-*.ttf` to `src/renderer/fonts/` with `@font-face` in `global.css` before Phase 1 Week 3 sign-off. |
| 2026-04-17 | Phase 0 | Pick real Keygen.sh SDK (or fetch + JWT) | P2 | `@keygen-sh/keygen-js` wasn't a real npm package. Phase 1 Week 4 picks between a maintained community SDK and rolling the HTTP + RSA signature verification by hand with `jose` or `node:crypto`. |
