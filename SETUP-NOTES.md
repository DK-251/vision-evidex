# SETUP-NOTES — Vision-EviDex

Environment snapshot as of the first scaffold commit. Update this file whenever a toolchain version changes or a machine is re-provisioned.

## CTS Laptop (code-authoring machine)

| Tool | Version | Notes |
|---|---|---|
| OS | Windows 11 Enterprise 10.0.26100 | |
| Node | v23.4.0 | Matches `engines.node: >=22.0.0` |
| npm | 10.9.2 | |
| Git | 2.52.0.windows.1 | |
| Git identity (local repo) | Deepak Sahu / deepak.sahu4@cognizant.com | Set via `git config` in repo, not globally |

**Known issue:** corporate SSL certificate interception breaks `node-gyp` when it fetches Node headers from nodejs.org during `npm install` of native modules (`better-sqlite3`, `sharp`, `canvas` via fabric). Mitigation: do not run `npm install` or `npm run dev` on the CTS laptop. All builds happen on the Asus TUF.

## Asus TUF (run machine)

First run reports started flowing on 2026-04-23 (`run-reports/latest.json` shows Node 22.22.2, Electron 30.x, all checks green). Tool-version cells below are still TBD — populate from `npm run verify-setup` output the next time the Asus TUF is in front of someone, and overwrite this row.

| Tool | Version | Notes |
|---|---|---|
| OS | Windows 11 | |
| Node | 22.22.2 (confirmed via run-report) | Should be v22 LTS via nvm-windows; full version still TBD |
| npm | TBD | To be populated after first Asus setup run |
| Git | TBD | To be populated after first Asus setup run |
| VS Build Tools | TBD | "Desktop development with C++" workload required |
| Python | TBD | node-gyp needs 3.9+ on PATH |

## GHE

- Repository: `https://github.com/DK-251/vision-evidex.git`
- Branch protection: `main` (TBD — enable once both machines verified)
- PAT storage: Windows Credential Manager on CTS laptop; backup in password manager

## Secrets checklist

- [ ] `EVIDEX_APP_SECRET` generated and stored in Windows System Environment Variables on CTS
- [ ] Backup of `EVIDEX_APP_SECRET` in password manager
- [ ] `.env` confirmed gitignored before first push (`git check-ignore .env`)
- [ ] Keygen.sh account creation deferred to Phase 1 Week 4

## Two-machine sync verification

- [x] First commit pushed from CTS
- [x] `git clone` + `git pull` works from Asus TUF
- [x] `scripts/setup-asus.ps1` run on Asus TUF
- [x] `npm run verify-setup` passes on Asus TUF
- [x] `npm run dev` launches the app on Asus TUF
- [x] `npm run report` writes `run-reports/latest.md` on Asus TUF
- [x] `run-reports/` pushed from Asus TUF
- [x] CTS pulls the run report

## Updates

| Date | Change |
|---|---|
| 2026-04-17 | Initial scaffold — CTS environment confirmed; Asus TUF pending first run |
| 2026-04-23 | Asus TUF first run-report green (`32ac2719`): typecheck PASS, 203/203 tests, PBKDF2 mean 94 ms (R-07 88% headroom), `npm audit --omit=dev` 0 critical. Two-machine sync verification all ticked. Tool-version cells in the Asus TUF table still TBD — populate next time the machine is in person. |
