git add -A && git commit -m "[W10] feat: D34+D36+D41-D44+PM-03+PM-08+DB-04/05+D28 — toolbar UI, region capture, annotation editor, project settings, archive, auto-backup, dashboard session indicator

D34 src/region/App.tsx — rubber-band region selector, crosshair, IPC REGION_SELECTED/CANCEL
D36 src/toolbar/App.tsx — full toolbar UI: counter, capture buttons, end session, collapse. showToolbarWindow re-enabled
D41-D44 src/annotation/App.tsx — Fabric.js editor: arrow/text/highlight/blur, undo-redo 20 steps, EC-12/13/14
PM-03 src/renderer/pages/ProjectSettingsPage.tsx — NEW rename + re-client form
PM-08 danger zone archive button in ProjectSettingsPage
ProjectService.update() — patches name/clientName/status, refreshes recent_projects
D28 EvidexContainerService.backup() — auto-backup every 10th capture (R-12 mitigation)
DB-04 Quick Tour button in DashboardPage Quick Actions
DB-05 session active indicator: reactive useSessionStore replaces static span
IPC: CAPTURE_OPEN_ANNOTATION, PROJECT_UPDATE, ANNOTATION_LOAD/SAVE, REGION_SELECTED/CANCEL
broadcastCapture() helper in app.ts consolidates SESSION_STATUS_UPDATE + CAPTURE_FLASH + CAPTURE_ARRIVED
nav-store: project-settings page + isProjectPage list updated
renderer App.tsx: ProjectSettingsPage switch case
__tests__/w10-coverage.spec.ts: 20 new assertions
FEATURES.md: 41->51/92. DB(5/5), EC(17/17), PM(10/10) COMPLETE
CHANGELOG.md, CLAUDE.md, INBOX-TO-ASUS.md all updated" && git push origin main
