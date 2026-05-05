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

## Audits

### Rule 4 audit — DB prepared statements — PASS (2026-05-05)

Phase 1 Week 4 rule, overdue per BACKLOG, closed at start of Phase 2 Week 8.

- Three `db.exec()` call sites in [`database.service.ts`](src/main/services/database.service.ts): lines 46 (`initAppSchema` DDL), 87 (`initProjectSchema` DDL — `schema_migrations` only), and 104 (`db.exec(m.up)` running migration strings from `PROJECT_MIGRATIONS`). All three are static SQL: schema CREATE TABLE statements + migration `up` literals. None take user input. `db.exec` is required because better-sqlite3's `prepare()` is single-statement only — DDL multi-statement is a known acceptable pattern.
- All data-path writes use `db.prepare(sql).run(args)` / `.get()` / `.all()` with `?` positional or `@key` named bound parameters. Spot-checked: `insertProject` (line 132 — `@`-style), `updateCaptureTag` (line 346 — `?`-style), `updateCaptureNotes` (line 358 — `?`-style), `upsertRecentProject` (line 661), `getProject` (line 156), all `insert*` / `select*` / `get*` variants.
- Zero string-interpolated SQL found anywhere in DatabaseService.

### Rule 6 audit — atomic file writes — PASS (2026-05-05)

Phase 1 Week 4 rule, partially verified per CLAUDE.md §8 (only `EvidexContainerService.save()` was confirmed). All remaining file writers audited:

| Service | Path | Pattern | Verdict |
|---|---|---|---|
| `EvidexContainerService.save()` | [`evidex-container.service.ts:134-138`](src/main/services/evidex-container.service.ts#L134-L138) | `writeFile(.tmp)` → `copyFile(orig→.bak)` → `rename(.tmp→final)` | atomic ✓ |
| `LicenceService.writeLicenceFile()` | [`licence.service.ts:168-169`](src/main/services/licence.service.ts#L168-L169) | `writeFileSync(.tmp)` → `renameSync(.tmp→final)` | atomic ✓ |
| `SettingsService.saveSettings()` | [`settings.service.ts:72-73`](src/main/services/settings.service.ts#L72-L73) | `writeFileSync(.tmp)` → `renameSync(.tmp→final)` | atomic ✓ |
| `ManifestService` | [`manifest.service.ts`](src/main/services/manifest.service.ts) | Pure delegation to `container.appendManifest()` (in-memory map). No direct disk I/O — persistence flows via container.save's atomic path | N/A ✓ |
| `logger.ts` (log lines) | [`logger.ts:43`](src/main/logger.ts#L43) | `appendFileSync` (intentional append) | N/A — append-only log files do not atomic-rename ✓ |
| Branding logos | n/a | Rule 9 enforces `BrandingProfile.logoBase64` as a base64 string in DB; no disk write to atomicise | N/A ✓ |

All reachable file writers verified. CLAUDE.md §8 SUSPECT entries can be removed.

## Updates

| Date | Change |
|---|---|
| 2026-04-17 | Initial scaffold — CTS environment confirmed; Asus TUF pending first run |
| 2026-04-23 | Asus TUF first run-report green (`32ac2719`): typecheck PASS, 203/203 tests, PBKDF2 mean 94 ms (R-07 88% headroom), `npm audit --omit=dev` 0 critical. Two-machine sync verification all ticked. Tool-version cells in the Asus TUF table still TBD — populate next time the machine is in person. |
| 2026-05-05 | Rule 4 + Rule 6 audits both PASS — see *Audits* section above. CLAUDE.md §8 SUSPECT entries cleared. |
