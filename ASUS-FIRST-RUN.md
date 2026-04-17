# ASUS-FIRST-RUN — Step-by-step for the Asus TUF Run Machine

This document is the complete playbook for taking the Asus TUF from a fresh
Windows 11 install to a machine that runs `npm run dev` and generates its
first run report. Follow it once; day-to-day operation is much shorter
(see section 10 below).

---

## Prerequisites (install before cloning)

You must have these installed. Most will show up as `PASS` when
`scripts\setup-asus.ps1` runs — but if any are missing, the setup script
will tell you what to do.

| Tool | Version | Why | Link |
|---|---|---|---|
| Node.js | 22 LTS | Runtime for Electron + build tools | Install via nvm-windows, then `nvm install lts && nvm use lts` |
| nvm-windows | latest | Version manager for Node | https://github.com/coreybutler/nvm-windows/releases |
| Git for Windows | 2.x | Version control + credential manager | https://git-scm.com/download/win |
| Visual Studio Build Tools 2022 | 2022+ | Native module compilation (better-sqlite3, sharp) | https://visualstudio.microsoft.com/visual-cpp-build-tools/ |
| Python | 3.9+ | Required by node-gyp | https://www.python.org/downloads/ (check "Add Python to PATH") |

### VS Build Tools — critical workload

When running the VS Build Tools installer:

1. Select the **"Desktop development with C++"** workload.
2. Ensure the following individual components are selected:
   - MSVC v143 — VS 2022 C++ x64/x86 build tools
   - Windows 11 SDK (latest)
   - C++ CMake tools for Windows

Without these, `npx electron-rebuild` will fail on `better-sqlite3` and `sharp` (Risk R-04).

### GitHub PAT

You need a **Personal Access Token** to push/pull. Generate one on the GitHub account that owns https://github.com/DK-251/vision-evidex:

1. Go to github.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token (classic), expiration 90 days, scopes: `repo`, `read:org`
3. Copy the token immediately — you won't see it again
4. Paste into password manager under `Vision-EviDex/asus-pat`

When you first push/pull, Windows Credential Manager will prompt for username and password. Use your GitHub username and paste the PAT as the password. It will be cached.

---

## 1. Clone the repo

Open **Git Bash** or **PowerShell** in the folder where you want the repo
to live (e.g. `C:\dev\`):

```bash
git clone https://github.com/DK-251/vision-evidex.git
cd vision-evidex
```

## 2. Configure git identity (local to this repo)

```bash
git config user.name "Deepak Sahu"
git config user.email "deepak.sahu4@cognizant.com"
```

## 3. Create your `.env`

```powershell
copy .env.example .env
```

Open `.env` in any editor and confirm these lines exist:

```
EVIDEX_LICENCE_MODE=none
EVIDEX_SIGN_BUILD=false
```

**Do not** set `EVIDEX_APP_SECRET` in `.env` on the Asus — use Windows
System Environment Variables instead (Control Panel → System → Advanced
system settings → Environment Variables). The value is generated on CTS
and copied here. For Phase 0 + Phase 1 dev builds, it can be empty.

## 4. Run the setup script

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-asus.ps1
```

This does, in order:

1. Checks Windows build version (need 19041+)
2. Checks Node is ≥ v22
3. Checks Git is installed
4. Checks VS Build Tools C++ workload is present (warns if missing)
5. Runs `npm install`
6. Runs `npx electron-rebuild` — recompiles `better-sqlite3`, `sharp`, `node-machine-id` against Electron's ABI
7. Runs `npm run verify-setup`

Expected final output:

```
[PASS] Node vXX.X.X
[PASS] Git version X.X.X
[PASS] Visual Studio Build Tools with C++ workload detected
[PASS] npm install completed
[PASS] Native modules rebuilt against Electron
[ ..  ] Running verify-setup.js...
(verify-setup output)
=== Asus TUF setup complete. Try: npm run dev ===
```

### If `electron-rebuild` fails

This is Risk R-04. Paste the exact error into `INBOX-TO-CTS.md` and stop.
Common causes:
- VS Build Tools "Desktop development with C++" workload missing
- Python not on PATH
- Corporate network blocking node-gyp header downloads

## 5. First launch

```powershell
npm run dev
```

You should see an Electron window with the Phase 0 scaffold card:

- Title: **Vision-EviDex**
- Text: "Phase 0 scaffold. The shell boots, IPC bridge is wired, design tokens resolve."
- Licence: **valid** (in no-licence mode, always valid)
- Phase: **0 — scaffold**

Close the window when satisfied. Any errors in the terminal → paste into
`INBOX-TO-CTS.md`.

## 6. Generate the first run report

```powershell
npm run report
```

This writes:

- `run-reports/latest.json` — machine-readable result for CTS
- `run-reports/latest.md` — human-readable report
- `STATUS.md` — rewritten live pulse (also visible on the CTS side)
- `run-reports/benchmarks.jsonl` — one appended line with this run's timing

Phase 0 expected outcome: all 18 modules show SKIP, summary is 0 FAIL,
exit code 0.

## 7. Push the run report back to CTS

```bash
git add run-reports/ STATUS.md
git commit -m "chore: first Asus TUF run (Phase 0 scaffold verified)"
git push
```

The `.gitattributes` file makes run-reports merge=ours, so any future
merge conflict is resolved in favour of the Asus version automatically.

## 8. Read and respond to `INBOX-TO-ASUS.md`

Open `INBOX-TO-ASUS.md`. CTS has left instructions for the first run.
If anything is unresolved, append a reply in `INBOX-TO-CTS.md`:

```
## 2026-04-XX — Re: Initial scaffold push

[RESOLVED] All 18 modules SKIP as expected. npm run dev launches the
Phase 0 scaffold card. electron-rebuild succeeded without issue.
```

## 9. Confirm CTS side

Tell the CTS operator: "First run pushed." CTS then runs `git pull`,
reads `STATUS.md` + `run-reports/latest.md`, and opens the next Phase 0
or Phase 1 task.

---

## 10. Day-to-day cycle (after first setup)

**When CTS pushes a new feature branch:**

```bash
git fetch origin
git checkout feature/<name>
npm install              # only if package.json changed
npx electron-rebuild     # only if a native dep (better-sqlite3, sharp) was bumped
npm run verify-setup     # sanity check
npm run dev              # launch + smoke-test the feature
# <close the window>
npm run report           # regenerate latest.md + STATUS.md
git add run-reports/ STATUS.md
git commit -m "chore: run report for feature/<name>"
git push
git checkout main
```

**When you discover a bug or blocker:**

Append to `INBOX-TO-CTS.md` with:
- Exact error message / stack trace
- Command that triggered it
- What you expected

Don't try to fix it on the Asus. CTS fixes, pushes, you re-run.

---

## Troubleshooting

### `npm install` hangs or times out

Corporate firewall could be rate-limiting the npm registry. Wait 10 minutes and retry. If it persists, check `.npmrc` for proxy config.

### `electron-rebuild` fails with "Python not found"

```powershell
npm config set python "C:\Python39\python.exe"
```

Substitute your actual Python install path.

### `npm run dev` opens a blank window

Check DevTools console (F12). Most likely:
- Preload script path mismatch — CTS to fix in `window-config.ts`
- `evidexAPI` undefined — preload not loading

Paste the DevTools console error into `INBOX-TO-CTS.md`.

### Toolbar window appears in screenshots when capturing

`setContentProtection(true)` isn't taking effect. Could be Windows build issue (below 19041). Check `winver`.

### "Your branch is ahead of main by N commits" after `git pull`

Happens if you commit on the wrong branch. Don't force-push. Ask CTS to review before any destructive action.
