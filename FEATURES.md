# FEATURES — Vision-EviDex v1.0 Implementation Checklist

All P0 features from the PRD, organized by module. This file is the **implementation source of truth** (locked decision: feature ID tables win over header counts).

- **Updated by CTS** when a feature lands — check the box, set the commit SHA.
- **Validated by Asus** on `npm run report` — the run-report cross-references feature IDs against module status.

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` merged + run-report PASS · `[!]` blocked

## Progress snapshot

| Module | Done | Total |
|---|---|---|
| OB (Onboarding) | 8 | 13 |
| DB (Dashboard) | 5 | 5 |
| EC (Evidence Capture) | 17 | 17 |
| PM (Project Manager) | 9 | 10 |
| TE (Template Engine) | 0 | 11 |
| RB (Report Builder) | 0 | 13 |
| SR (Status Reports) | 0 | 4 |
| AU (Audit Pack) | 2 | 7 |
| WS (Workspace Settings) | 8 | 12 |
| **TOTAL P0** | **49** | **92** |

> **W10 update (2026-05-12):** D34 region capture overlay, D36 floating toolbar UI (showToolbarWindow re-enabled), D41-D44 annotation editor (Fabric.js, arrow/text/highlight/blur, undo-redo, EC-12/13/14), PM-03 project settings rename/re-client, PM-08 archive project, DB-04 Quick Tour, DB-05 session active indicator, D28 auto-backup every 10 captures all land this sprint. Dashboard fully complete (5/5). Evidence Capture fully complete (17/17). Project Manager partially complete (9/10 — PM-11 20MB cap deferred). Total: 49/92.

Note on count: PRD header says 82; per-section ID tables sum to 92 (some IDs are mode-conditional — e.g. OB-01…OB-05 only apply in standard mode). Per locked decision, **IDs are the source of truth**, count is advisory.

---

## Module 01 — Onboarding & Licence Activation

| ID | Feature | Phase | Commit | Run |
|---|---|---|---|---|
| [ ] OB-01 | Licence key entry screen (standard mode only) | P1 W4 | | |
| [ ] OB-02 | One-time Keygen.sh activation (standard mode only) | P1 W4 | | |
| [ ] OB-03 | Machine fingerprint binding (CPU+disk+MAC hash) (standard mode) | P1 W4 | | |
| [ ] OB-04 | Signed `licence.sig` file in AppData (standard mode) | P1 W4 | | |
| [ ] OB-05 | Offline licence validation on launch (standard mode) | P1 W4 | | |
| [x] OB-06 | Animated welcome tour (3 screens, skippable) | P1 W5 | 36367831 | W9 gate |
| [x] OB-07 | User profile setup — name, role, team, email | P1 W5 | 36367831 | W9 gate |
| [x] OB-08 | Organisation + branding setup (logo base64, colour) | P1 W5 | 36367831 | W9 gate |
| [x] OB-09 | Default report template selection | P1 W5 | 36367831 | W9 gate |
| [x] OB-10 | Global hotkey config with conflict detection | P1 W5 | 36367831 | W9 gate |
| [x] OB-11 | Theme selection — light / dark | P1 W5 | 36367831 | W9 gate |
| [x] OB-12 | Default storage path configuration | P1 W5 | 36367831 | W9 gate |
| [x] OB-13 | All-set summary screen with first-project CTA | P1 W5 | 36367831 | W9 gate |

## Module 02 — Dashboard

| ID | Feature | Phase | Commit | Run |
|---|---|---|---|---|
| [x] DB-01 | Metrics panel (active projects, today's sessions, evidence, reports) | P1 W5 | 36367831 | W9 gate |
| [x] DB-02 | Quick links (New Session, New Project, Import Metrics, Recent Reports) | P1 W5 | 36367831 | W9 gate |
| [x] DB-03 | Recent projects list with last-modified + status badge | P1 W5 | 36367831 | W9 gate |
| [x] DB-04 | Quick Tour button (replays onboarding walkthrough) | P1 W5 | W10-commit | W10 gate |
| [x] DB-05 | Session status indicator (shows if a session is active) | P1 W5 | W10-commit | W10 gate |

## Module 03 — Evidence Capture Engine

| ID | Feature | Phase | Commit | Run |
|---|---|---|---|---|
| [x] EC-01 | Session intake form (10 fields) | P2 W7 | 36367831 | W9 gate |
| [x] EC-02 | Session start / end with explicit lifecycle | P2 W7 | 36367831 | W9 gate |
| [x] EC-03 | Floating always-on-top capture toolbar | P2 W7 | W10-commit | W10 gate |
| [x] EC-04 | Global hotkey — full screen capture | P2 W7 | 36367831 | Asus HW confirmed |
| [x] EC-05 | Global hotkey — active window capture | P2 W7 | W10-commit | W10 gate |
| [x] EC-06 | Global hotkey — custom region (rubber-band) | P2 W7 | W10-commit | W10 gate |
| [x] EC-07 | Capture flash effect — 80ms white overlay | P2 W7 | 36367831 | Asus HW confirmed |
| [x] EC-08 | Auto-metadata stamping on every capture | P2 W7 | 36367831 | W9 gate |
| [x] EC-09 | SHA-256 hash on raw bytes BEFORE compression | P2 W7 | 36367831 | Rule 7 audit pass |
| [x] EC-10 | JPEG 85% auto-compression (original preserved) | P2 W7 | 36367831 | W9 gate |
| [x] EC-11 | Inline pass/fail/blocked/skip status tagging | P2 W8 | 36367831 | Asus HW confirmed |
| [x] EC-12 | Annotation editor (arrows, text, highlights, steps) | P2 W9 | W10-commit | W10 gate |
| [x] EC-13 | PII redaction / blur tool (rect + freehand) | P2 W9 | W10-commit | W10 gate |
| [x] EC-14 | Annotation layer stored separately; original immutable | P2 W9 | W10-commit | W10 gate |
| [x] EC-15 | Auto-naming convention applied on every capture | P2 W7 | 36367831 | W9 gate |
| [x] EC-16 | Session gallery (thumbnail grid during session) | P2 W8 | 36367831 | Asus HW confirmed |
| [x] EC-17 | Capture counter on toolbar | P2 W8 | W10-commit | W10 gate |

## Module 04 — Session & Project Manager

| ID | Feature | Phase | Commit | Run |
|---|---|---|---|---|
| [x] PM-01 | Create new project (name, client, start date, template, branding) | P1 W6 | b19dd61 | W8 gate |
| [x] PM-02 | Open existing `.evidex` file | P1 W6 | b19dd61 | W8 gate |
| [x] PM-03 | Project settings (rename, client, template, branding) | P1 W6 | W10-commit | W10 gate |
| [x] PM-04 | Auto-naming convention engine (10 tokens) | P1 W4 | 36367831 | W9 gate |
| [x] PM-05 | Session list view with intake summary + status | P2 W8 | 36367831 | W9 built |
| [x] PM-06 | Session detail view — gallery, intake, pass/fail summary | P2 W8 | 36367831 | W9 built |
| [x] PM-07 | Test case ID linkage (session → Test ID, Req ID) | P2 W7 | 36367831 | W9 gate |
| [x] PM-08 | Archive project (mark archived, preserve data) | P1 W6 | W10-commit | W10 gate |
| [ ] PM-11 | 20 MB project cap (warning 15MB, block 20MB) | P1 W6 | | |
| [x] PM-12 | Atomic save (`.tmp` → rename → `.evidex`) | P1 W4 | b19dd61 | Rule 6 audit |

## Module 05 — Template Engine

| ID | Feature | Phase | Commit | Run |
|---|---|---|---|---|
| [ ] TE-01 | Pre-built template library (5 templates) | P3 | | |
| [ ] TE-02 | Visual drag-and-drop template builder canvas | P3 | | |
| [ ] TE-03 | Block palette (7 block types) | P3 | | |
| [ ] TE-04 | Block configuration panel (label, placeholder, required, width) | P3 | | |
| [ ] TE-05 | Save template to local library | P3 | | |
| [ ] TE-06 | Clone pre-built template (pre-built = read-only) | P3 | | |
| [ ] TE-07 | Branding profile management (CRUD) | P1 W5 | | |
| [ ] TE-08 | Apply branding profile to any template | P3 | | |
| [ ] TE-09 | Mandatory field enforcement on export | P3 | | |
| [ ] TE-10 | Template preview before applying | P3 | | |
| [ ] TE-11 | Delete template (not pre-built) | P3 | | |

## Module 06 — Report Builder & Export

| ID | Feature | Phase | Commit | Run |
|---|---|---|---|---|
| [ ] RB-01 | Metrics import — Excel (`.xlsx`) locked schema | P3 | | |
| [ ] RB-02 | Metrics import — JSON locked schema | P3 | | |
| [ ] RB-03 | Import template version header validation | P3 | | |
| [ ] RB-04 | Live report preview (updates as data lands) | P3 | | |
| [ ] RB-05 | Auto-generated cover page | P3 | | |
| [ ] RB-06 | Auto-populated metrics summary section | P3 | | |
| [ ] RB-07 | Auto-generated traceability table | P3 | | |
| [ ] RB-08 | Section reorder (drag before export) | P3 | | |
| [ ] RB-09 | Add custom comment/narrative to a section | P3 | | |
| [ ] RB-10 | Export to Word (`.docx`) | P3 | | |
| [ ] RB-11 | Export to PDF | P3 | | |
| [ ] RB-12 | Export to self-contained HTML | P3 | | |
| [ ] RB-13 | Branding profile auto-applied to exports | P3 | | |

## Module 07 — Daily & Status Reports

| ID | Feature | Phase | Commit | Run |
|---|---|---|---|---|
| [ ] SR-01 | One-click Daily Status Report from today's sessions | P3 | | |
| [ ] SR-02 | DSR editable fields (blockers, tomorrow, notes) | P3 | | |
| [ ] SR-03 | Weekly Status Report aggregator (combines 5 DSRs) | P3 | | |
| [ ] SR-04 | Test Summary Report builder (metrics + sessions) | P3 | | |

## Module 08 — Audit & Compliance Pack

| ID | Feature | Phase | Commit | Run |
|---|---|---|---|---|
| [ ] AU-01 | SHA-256 integrity check (report mismatches) | P4 | | |
| [ ] AU-02 | Formal sign-off record (name, role, decision, comment) | P4 | | |
| [ ] AU-03 | Sign-off stored inside `.evidex` (not email) | P4 | | |
| [ ] AU-04 | One-click Audit Evidence Bundle (7 artefacts) | P4 | | |
| [x] AU-05 | Immutable version history (append-only) | P1 W4 | 36367831 | W9 gate |
| [x] AU-06 | Local access log (open/edit/export events, append-only) | P1 W4 | 36367831 | W9 gate |
| [ ] AU-07 | Traceability matrix (evidence ↔ test case ID ↔ req ID) | P4 | | |

## Module 09 — Workspace Settings

| ID | Feature | Phase | Commit | Run |
|---|---|---|---|---|
| [x] WS-01 | User profile edit (name, role, team, email) | P1 W5 | 36367831 | W9 gate |
| [x] WS-02 | Hotkey configuration (remap capture + session shortcuts) | P1 W5 | 36367831 | Asus HW confirmed |
| [ ] WS-03 | Hotkey preset profiles (Default, Power User, Minimal) | P1 W5 | | |
| [x] WS-04 | Theme toggle (light/dark, persisted) | P1 W5 | 36367831 | W9 gate |
| [ ] WS-05 | Font size preference (Normal / Large) | P1 W5 | | |
| [x] WS-06 | Default storage path for new `.evidex` files | P1 W5 | 36367831 | W9 gate |
| [ ] WS-07 | Export path (default folder for exports) | P1 W5 | | |
| [x] WS-08 | Organisation defaults (template, branding, naming) | P1 W5 | 36367831 | W9 gate |
| [x] WS-09 | Branding profile management | P1 W5 | 36367831 | W9 gate |
| [x] WS-10 | Licence information (mode-dependent) | P1 W5 | 36367831 | W9 gate |
| [ ] WS-11 | Download latest import templates (user-triggered online) | P3 | | |
| [x] WS-13 | Keyboard shortcuts reference | P1 W5 | 36367831 | W9 gate |
