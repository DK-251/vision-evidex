# INBOX — Asus TUF → CTS

Append-only messages from the Asus TUF run machine to the CTS laptop. Asus writes here when it needs the code machine to fix something, clarify a design, or address a test failure not visible in the run report.

**Protocol:**
- Append new entries at the TOP (reverse chronological).
- Date format: `YYYY-MM-DD HH:MM` (local Asus time).
- Mark entries resolved with `[RESOLVED YYYY-MM-DD]` prefix when CTS has addressed them. Never delete.
- Paste exact error output (stack traces, file:line, command run). The more concrete, the less back-and-forth.

---

## 2026-04-18 08:10 — First run complete + vulnerability handoff

**From:** Asus TUF run machine

### First-run status

- `scripts\\setup-asus.ps1`: completed successfully
- `npm run dev`: app booted cleanly (Phase 0 scaffold)
- `npm run report`: generated expected scaffold report (PASS 0 / FAIL 0 / SKIP 18)

### Security note for CTS

- A dependency audit was run: `npm audit --omit=dev`
- Result: 8 vulnerabilities (3 low, 5 high)
- Key impacted packages: `xlsx`, `tar` chain via `canvas`, `@tootallnate/once` chain
- `npm audit fix --force` suggests bumping `fabric` to 7.x (breaking + violates pinned `fabric@5.3.0` decision)

Please review and track remediation from the new file: `VULNERABILITIES.md`.
