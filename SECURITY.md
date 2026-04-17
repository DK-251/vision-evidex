# Security Notes

## Secrets

The following values are **never committed** to this repository:

- `EVIDEX_APP_SECRET` — 64-char hex string used as input to PBKDF2 for `.evidex` encryption key derivation. Generated once per deployment and stored in:
  - Windows System Environment Variables (on the CTS laptop)
  - A corporate password manager (as backup)
- Code signing certificate (`.pfx`) and its password
- Any `licence.sig` file produced by Keygen.sh activation
- Any `.evidex` project file containing real evidence

`.gitignore` blocks `.env*`, `*.sig`, `*.pfx`, `*.evidex` — verify with `git check-ignore` before pushing if in doubt.

## Generating `EVIDEX_APP_SECRET`

PowerShell on the CTS laptop:

```powershell
-join ((1..32) | % { '{0:x2}' -f (Get-Random -Max 256) })
```

Copy the output into:

1. Windows → System Properties → Environment Variables → New (User): `EVIDEX_APP_SECRET = <value>`
2. Password manager entry `Vision-EviDex/app_secret`

## Reporting a vulnerability

Internal: raise a ticket tagged `security` on the internal tracker and CC the product owner. Do **not** disclose in public GitHub issues.

## Build-time guardrails

- `.gitignore` enforces secret exclusion from first commit
- `window-config.ts` enforces: `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true` on every `BrowserWindow`
- CSP header applied globally: `connect-src 'none'` blocks all outbound traffic from the renderer
- `DatabaseService` exposes no UPDATE/DELETE methods for `sign_offs`, `access_log`, or `version_history` tables
