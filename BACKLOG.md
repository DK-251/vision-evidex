# BACKLOG — Vision-EviDex

Ideas, enhancements, and discovered work that doesn't fit in the current sprint. Add an entry whenever something comes up mid-work that shouldn't derail the task at hand.

**Format:** `YYYY-MM-DD · [SPRINT-DISCOVERED] · IDEA · PRIORITY · NOTES`

---

| Date | Sprint | Idea | Priority | Notes |
|---|---|---|---|---|
| 2026-04-17 | Phase 0 | Resolve CTS corporate SSL cert for node-gyp | P2 | Currently a Phase 0 open item. Asus TUF covers builds, so not blocking. Fix when someone wants to run `npm run dev` on CTS. |
| 2026-04-17 | Phase 0 | Ship bundled Inter font files | P1 | Tokens reference `var(--font-sans)` which falls back to system-ui. Add `Inter-*.ttf` to `src/renderer/fonts/` with `@font-face` in `global.css` before Phase 1 Week 3 sign-off. |
| 2026-04-17 | Phase 0 | Pick real Keygen.sh SDK (or fetch + JWT) | P2 | `@keygen-sh/keygen-js` wasn't a real npm package. Phase 1 Week 4 picks between a maintained community SDK and rolling the HTTP + RSA signature verification by hand with `jose` or `node:crypto`. |
