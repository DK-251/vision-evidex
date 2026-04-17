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

Fill in after first `setup-asus.ps1` run.

| Tool | Version | Notes |
|---|---|---|
| OS | Windows 11 | |
| Node | TBD | Should be v22 LTS via nvm-windows |
| npm | TBD | |
| Git | TBD | |
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

- [ ] First commit pushed from CTS
- [ ] `git clone` + `git pull` works from Asus TUF
- [ ] `scripts/setup-asus.ps1` run on Asus TUF
- [ ] `npm run verify-setup` passes on Asus TUF
- [ ] `npm run dev` launches the app on Asus TUF
- [ ] `npm run report` writes `run-reports/latest.md` on Asus TUF
- [ ] `run-reports/` pushed from Asus TUF
- [ ] CTS pulls the run report

## Updates

| Date | Change |
|---|---|
| 2026-04-17 | Initial scaffold — CTS environment confirmed; Asus TUF pending first run |
