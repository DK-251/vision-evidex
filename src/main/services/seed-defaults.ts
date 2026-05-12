import type { Template } from '@shared/types/entities';
import { DatabaseService } from './database.service';

/**
 * Phase 2 Wk 8 — first-run seed for the app.db library tables.
 *
 * `insertTemplate` and `saveBrandingProfile` are idempotent
 * (INSERT OR IGNORE / ON CONFLICT) so this runs cheaply on every boot —
 * no boolean "first-run" flag needed.
 *
 * The minimal `tpl-default-tsr` row stays for backwards-compat with the
 * Wk 8 row that ships in existing user containers; the four full
 * builtins below mirror the JSON in `/templates/*.json` (which Phase 3's
 * Template Builder will surface as read-only library entries).
 */

const BUILTIN_TEMPLATE: Omit<Template, 'createdAt' | 'updatedAt'> = {
  id: 'tpl-default-tsr',
  name: 'Test Summary Report (default)',
  description: 'Three-section minimal TSR — header, evidence, sign-off. Phase 3 expands this.',
  isBuiltin: true,
  schema: {
    reportType: 'TSR',
    sections: [
      {
        id: 'header',
        type: 'branding_header',
        label: 'Report header',
        required: true,
        columnSpan: 3,
        config: {},
      },
      {
        id: 'evidence',
        type: 'image_slot',
        label: 'Evidence captures',
        required: true,
        columnSpan: 3,
        config: { source: 'session_captures' },
      },
      {
        id: 'sign-off',
        type: 'signature_block',
        label: 'Sign-off',
        required: true,
        columnSpan: 3,
        config: {},
      },
    ],
  },
};

const BUILTIN_DSR: Omit<Template, 'createdAt' | 'updatedAt'> = {
  id: 'tpl_builtin_dsr',
  name: 'Daily Status Report',
  description: "Daily communication sent to project teams. One-click generate from today's sessions.",
  isBuiltin: true,
  schema: {
    reportType: 'DSR',
    sections: [
      { id: 'header',            type: 'branding_header', label: 'Header',                       required: true,  columnSpan: 3, config: { variant: 'compact' } },
      { id: 'date_project',      type: 'text_field',      label: 'Date / Project',               required: true,  columnSpan: 3, config: {} },
      { id: 'exec_today',        type: 'metrics_table',   label: "Today's Execution Summary",     required: true,  columnSpan: 3, config: { source: 'today_sessions' } },
      { id: 'defects',           type: 'metrics_table',   label: 'Defects Raised / Closed',      required: true,  columnSpan: 3, config: {} },
      { id: 'blockers',          type: 'rich_text',       label: 'Blockers',                     required: true,  columnSpan: 3, config: {} },
      { id: 'tomorrow',          type: 'rich_text',       label: "Tomorrow's Plan",              required: true,  columnSpan: 3, config: {} },
      { id: 'tester_breakdown',  type: 'metrics_table',   label: 'Tester Breakdown',             required: false, columnSpan: 3, config: {} },
    ],
  },
};

const BUILTIN_UAT: Omit<Template, 'createdAt' | 'updatedAt'> = {
  id: 'tpl_builtin_uat',
  name: 'UAT Handoff Report',
  description: 'User acceptance testing handoff with client sign-off block.',
  isBuiltin: true,
  schema: {
    reportType: 'UAT',
    sections: [
      { id: 'cover',              type: 'branding_header',  label: 'Cover page',         required: true,  columnSpan: 3, config: { variant: 'title' } },
      { id: 'project_overview',   type: 'rich_text',        label: 'Project Overview',   required: true,  columnSpan: 3, config: {} },
      { id: 'uat_scope',          type: 'rich_text',        label: 'UAT Scope',          required: true,  columnSpan: 3, config: {} },
      { id: 'env',                type: 'text_field',       label: 'Test Environment',   required: true,  columnSpan: 3, config: {} },
      { id: 'exec_results',       type: 'metrics_table',    label: 'Execution Results',  required: true,  columnSpan: 3, config: { source: 'imported_metrics' } },
      { id: 'defect_list',        type: 'metrics_table',    label: 'Defect List',        required: true,  columnSpan: 3, config: {} },
      { id: 'outstanding_risks',  type: 'rich_text',        label: 'Outstanding Risks',  required: false, columnSpan: 3, config: {} },
      { id: 'client_signoff',     type: 'signature_block',  label: 'Client Sign-off',    required: true,  columnSpan: 3, config: {} },
    ],
  },
};

const BUILTIN_BUG: Omit<Template, 'createdAt' | 'updatedAt'> = {
  id: 'tpl_builtin_bug',
  name: 'Bug / Defect Report',
  description: 'Standalone defect report with reproduction steps and evidence slots.',
  isBuiltin: true,
  schema: {
    reportType: 'BUG',
    sections: [
      { id: 'header',     type: 'branding_header', label: 'Header',                required: true, columnSpan: 3, config: {} },
      { id: 'bug_id',     type: 'text_field',      label: 'Bug ID',                required: true, columnSpan: 1, config: {} },
      { id: 'severity',   type: 'text_field',      label: 'Severity',              required: true, columnSpan: 1, config: {} },
      { id: 'priority',   type: 'text_field',      label: 'Priority',              required: true, columnSpan: 1, config: {} },
      { id: 'summary',    type: 'text_field',      label: 'Summary',               required: true, columnSpan: 3, config: {} },
      { id: 'steps',      type: 'rich_text',       label: 'Steps to Reproduce',    required: true, columnSpan: 3, config: {} },
      { id: 'expected',   type: 'rich_text',       label: 'Expected vs Actual',    required: true, columnSpan: 3, config: {} },
      { id: 'env',        type: 'text_field',      label: 'Environment',           required: true, columnSpan: 3, config: {} },
      { id: 'evidence',   type: 'image_slot',      label: 'Screenshot Evidence',   required: true, columnSpan: 3, config: { allowMultiple: true } },
      { id: 'status',     type: 'text_field',      label: 'Status',                required: true, columnSpan: 3, config: {} },
    ],
  },
};

const BUILTIN_AUDIT: Omit<Template, 'createdAt' | 'updatedAt'> = {
  id: 'tpl_builtin_audit',
  name: 'Audit Evidence Pack',
  description: 'Full audit bundle template — traceability matrix, SHA-256 manifest, sign-offs, access log.',
  isBuiltin: true,
  schema: {
    reportType: 'AUDIT',
    sections: [
      { id: 'cover',             type: 'branding_header', label: 'Audit Cover',              required: true, columnSpan: 3, config: { variant: 'title' } },
      { id: 'project_metadata',  type: 'text_field',      label: 'Project Metadata',         required: true, columnSpan: 3, config: {} },
      { id: 'tester_roster',     type: 'metrics_table',   label: 'Tester Roster',            required: true, columnSpan: 3, config: {} },
      { id: 'session_list',      type: 'metrics_table',   label: 'Session List with Hashes', required: true, columnSpan: 3, config: { source: 'sessions_with_hashes' } },
      { id: 'traceability',      type: 'metrics_table',   label: 'Traceability Matrix',      required: true, columnSpan: 3, config: { source: 'traceability' } },
      { id: 'manifest',          type: 'metrics_table',   label: 'SHA-256 Manifest',         required: true, columnSpan: 3, config: { source: 'manifest' } },
      { id: 'signoff_records',   type: 'signature_block', label: 'Sign-off Records',         required: true, columnSpan: 3, config: { showAll: true } },
      { id: 'integrity_log',     type: 'metrics_table',   label: 'Integrity / Access Log',   required: true, columnSpan: 3, config: { source: 'access_log' } },
    ],
  },
};

const DEFAULT_BRANDING_PROFILE = {
  id: 'brand-default',
  name: 'Default (Vision-EviDex)',
  companyName: 'My Company',
  logoBase64: null,
  logoMimeType: null,
  primaryColor: '#0078D4',
} as const;

export function seedBuiltinDefaults(appDb: DatabaseService): void {
  // `insertTemplate` uses INSERT OR IGNORE, so re-running this on
  // already-seeded app.db rows is a no-op. The five builtin rows are
  // the read-only library the Phase 3 Template Builder will surface.
  appDb.insertTemplate(BUILTIN_TEMPLATE);
  appDb.insertTemplate(BUILTIN_DSR);
  appDb.insertTemplate(BUILTIN_UAT);
  appDb.insertTemplate(BUILTIN_BUG);
  appDb.insertTemplate(BUILTIN_AUDIT);

  // saveBrandingProfile uses ON CONFLICT DO UPDATE — but the only fields
  // it would re-write are user-editable ones. For a fresh row this is
  // effectively an INSERT; for an existing user-customised "Default",
  // we still don't want to clobber their changes, so guard explicitly.
  if (!appDb.getBrandingProfile(DEFAULT_BRANDING_PROFILE.id)) {
    appDb.saveBrandingProfile({ ...DEFAULT_BRANDING_PROFILE });
  }
}
