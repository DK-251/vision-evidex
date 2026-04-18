/**
 * Project-DB schema v1 — lives inside every `.evidex` container.
 * See Architecture §5.2 for the authoritative schema reference.
 *
 * Every table is created here; no later ALTER TABLE edits are permitted
 * in this migration. Schema changes ship as new migration entries in
 * `src/main/migrations/index.ts` so already-open projects can upgrade.
 */

export const MIGRATION_001_INITIAL_SCHEMA_UP = `
CREATE TABLE projects (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  client_name      TEXT NOT NULL,
  description      TEXT,
  start_date       TEXT NOT NULL,
  template_id      TEXT NOT NULL,
  branding_profile TEXT NOT NULL,
  naming_pattern   TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active',
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  app_version      TEXT NOT NULL
);

CREATE TABLE sessions (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL REFERENCES projects(id),
  test_id          TEXT NOT NULL,
  test_name        TEXT NOT NULL,
  test_data_matrix TEXT,
  scenario         TEXT NOT NULL,
  requirement_id   TEXT,
  requirement_desc TEXT,
  environment      TEXT NOT NULL,
  app_under_test   TEXT NOT NULL,
  tester_name      TEXT NOT NULL,
  tester_email     TEXT NOT NULL,
  started_at       TEXT NOT NULL,
  ended_at         TEXT,
  capture_count    INTEGER NOT NULL DEFAULT 0,
  pass_count       INTEGER NOT NULL DEFAULT 0,
  fail_count       INTEGER NOT NULL DEFAULT 0,
  blocked_count    INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'active'
);
CREATE INDEX idx_sessions_project_id ON sessions(project_id);

CREATE TABLE captures (
  id               TEXT PRIMARY KEY,
  session_id       TEXT NOT NULL REFERENCES sessions(id),
  project_id       TEXT NOT NULL REFERENCES projects(id),
  sequence_num     INTEGER NOT NULL,
  filename         TEXT NOT NULL,
  original_path    TEXT NOT NULL,
  annotated_path   TEXT,
  sha256_hash      TEXT NOT NULL,
  file_size_bytes  INTEGER NOT NULL,
  capture_mode     TEXT NOT NULL,
  status_tag       TEXT NOT NULL DEFAULT 'untagged',
  os_version       TEXT NOT NULL,
  machine_name     TEXT NOT NULL,
  app_version      TEXT NOT NULL,
  notes            TEXT,
  captured_at      TEXT NOT NULL,
  has_annotation   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_captures_session_id ON captures(session_id);
CREATE INDEX idx_captures_project_id ON captures(project_id);

CREATE TABLE annotation_layers (
  id         TEXT PRIMARY KEY,
  capture_id TEXT NOT NULL REFERENCES captures(id),
  layer_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_annotation_layers_capture_id ON annotation_layers(capture_id);

-- APPEND-ONLY: no UPDATE or DELETE statements anywhere in DatabaseService.
CREATE TABLE sign_offs (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id),
  reviewer_name TEXT NOT NULL,
  reviewer_role TEXT NOT NULL,
  decision      TEXT NOT NULL,
  comments      TEXT,
  signed_at     TEXT NOT NULL,
  submitted_by  TEXT NOT NULL
);
CREATE INDEX idx_sign_offs_project_id ON sign_offs(project_id);

CREATE TABLE import_history (
  id             TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL REFERENCES projects(id),
  filename       TEXT NOT NULL,
  imported_at    TEXT NOT NULL,
  imported_by    TEXT NOT NULL,
  field_count    INTEGER NOT NULL,
  schema_version TEXT NOT NULL
);
CREATE INDEX idx_import_history_project_id ON import_history(project_id);

-- APPEND-ONLY
CREATE TABLE access_log (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id),
  event_type   TEXT NOT NULL,
  event_detail TEXT,
  performed_by TEXT NOT NULL,
  performed_at TEXT NOT NULL
);
CREATE INDEX idx_access_log_project_id ON access_log(project_id);

-- APPEND-ONLY
CREATE TABLE version_history (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id),
  saved_at    TEXT NOT NULL,
  saved_by    TEXT NOT NULL,
  app_version TEXT NOT NULL
);
CREATE INDEX idx_version_history_project_id ON version_history(project_id);
`;
