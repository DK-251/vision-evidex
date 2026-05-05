import type { Template } from '@shared/types/entities';
import { DatabaseService } from './database.service';

/**
 * Phase 2 Wk 8 — first-run seed for the app.db library tables.
 *
 * Per AQ3, the Wk 8 ship-target is exactly one builtin template + one
 * default branding profile. Both `insertTemplate` and `saveBrandingProfile`
 * are idempotent (INSERT OR IGNORE / ON CONFLICT) so this runs cheaply
 * on every boot — no boolean "first-run" flag needed.
 *
 * TODO Phase 3: seed remaining 4 builtin templates (DSR, UAT, BUG, AUDIT)
 * alongside the Template Builder UI.
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

const DEFAULT_BRANDING_PROFILE = {
  id: 'brand-default',
  name: 'Default (Vision-EviDex)',
  companyName: 'My Company',
  logoBase64: null,
  logoMimeType: null,
  primaryColor: '#0078D4',
} as const;

export function seedBuiltinDefaults(appDb: DatabaseService): void {
  appDb.insertTemplate(BUILTIN_TEMPLATE);

  // saveBrandingProfile uses ON CONFLICT DO UPDATE — but the only fields
  // it would re-write are user-editable ones. For a fresh row this is
  // effectively an INSERT; for an existing user-customised "Default",
  // we still don't want to clobber their changes, so guard explicitly.
  if (!appDb.getBrandingProfile(DEFAULT_BRANDING_PROFILE.id)) {
    appDb.saveBrandingProfile({ ...DEFAULT_BRANDING_PROFILE });
  }
}
