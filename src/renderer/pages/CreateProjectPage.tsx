import { useEffect, useState, type FormEvent } from 'react';
import {
  ChevronLeftRegular,
  FolderOpenRegular,
} from '@fluentui/react-icons';
import {
  Button,
  Card,
  CardDivider,
  Input,
  Textarea,
  Dropdown,
  ProgressRing,
  type DropdownOption,
} from '../components/ui';
import { useNavStore } from '../stores/nav-store';
import { useProjectStore } from '../stores/project.store';
import type { Template, BrandingProfile } from '@shared/types/entities';

/**
 * S-11 (Docs §15) — Create project. Full-page form per PRD §6.2 US-PM-01
 * AC1 (not a modal). Two sections: project info + configuration.
 *
 * Naming pattern preview round-trips main via the `naming:preview` IPC
 * (AQ4) — debounced 200 ms so a fast typist does not flood the channel.
 *
 * Storage path picker uses `dialog:openFolder` (Wk 8 IPC) and falls
 * back to a read-only display when the user has not picked yet.
 */

const DEFAULT_NAMING_PATTERN = '{ProjectCode}_{TestID}_{Date}_{Time}_{Seq}';

interface FormState {
  name: string;
  clientName: string;
  description: string;
  startDate: string;
  templateId: string;
  brandingProfileId: string;
  namingPattern: string;
  storagePath: string;
}

const todayISO = (): string => new Date().toISOString().slice(0, 10);

const initialForm = (): FormState => ({
  name: '',
  clientName: '',
  description: '',
  startDate: todayISO(),
  templateId: '',
  brandingProfileId: '',
  namingPattern: DEFAULT_NAMING_PATTERN,
  storagePath: '',
});

export function CreateProjectPage(): JSX.Element {
  const navigate = useNavStore((s) => s.navigate);
  const goBack = useNavStore((s) => s.goBack);
  const createProject = useProjectStore((s) => s.createProject);

  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [brandings, setBrandings] = useState<BrandingProfile[]>([]);
  const [preview, setPreview] = useState<string>('');

  // Load templates + branding profiles + default storage path from settings.
  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      const [tplResult, brandResult, settingsResult] = await Promise.all([
        window.evidexAPI.template.list(),
        window.evidexAPI.branding.list(),
        window.evidexAPI.settings.get(),
      ]);
      if (cancelled) return;

      if (tplResult.ok) setTemplates(tplResult.data);
      if (brandResult.ok) setBrandings(brandResult.data);

      // Pre-fill defaults from settings + first builtin row of each list.
      setForm((prev) => ({
        ...prev,
        templateId: prev.templateId || (tplResult.ok && tplResult.data[0]?.id) || '',
        brandingProfileId: prev.brandingProfileId || (brandResult.ok && brandResult.data[0]?.id) || '',
        storagePath:
          prev.storagePath || (settingsResult.ok ? settingsResult.data.defaultStoragePath : '') || '',
      }));
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Live filename preview — debounced 200 ms.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const payload: { pattern: string; projectName?: string; clientName?: string } = {
        pattern: form.namingPattern,
        ...(form.name ? { projectName: form.name } : {}),
        ...(form.clientName ? { clientName: form.clientName } : {}),
      };

      void window.evidexAPI.project.previewNamingPattern(payload).then((r) => {
        if (r.ok) setPreview(r.data);
      });
    }, 200);
    return () => window.clearTimeout(t);
  }, [form.namingPattern, form.name, form.clientName]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = 'Required';
    if (!form.clientName.trim()) next.clientName = 'Required';
    if (!form.startDate.trim()) next.startDate = 'Required';
    if (!form.templateId) next.templateId = 'Pick a template';
    if (!form.brandingProfileId) next.brandingProfileId = 'Pick a branding profile';
    if (!form.storagePath.trim()) next.storagePath = 'Choose a folder';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function pickFolder(): Promise<void> {
    const result = await window.evidexAPI.dialog.openFolder({
      title: 'Choose project storage folder',
      ...(form.storagePath ? { defaultPath: form.storagePath } : {}),
    });
    if (result.ok && !result.data.cancelled && result.data.path) {
      setField('storagePath', result.data.path);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const project = await createProject({
        name: form.name.trim(),
        clientName: form.clientName.trim(),
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
        startDate: form.startDate,
        templateId: form.templateId,
        brandingProfileId: form.brandingProfileId,
        storagePath: form.storagePath,
        namingPattern: form.namingPattern,
      });
      navigate('session-intake', { projectId: project.id });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  const tplOptions: DropdownOption[] = templates.map((t) => ({ label: t.name, value: t.id }));
  const brandOptions: DropdownOption[] = brandings.map((b) => ({ label: b.name, value: b.id }));

  return (
    <div
      className="shell-content-column"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <button
          type="button"
          onClick={goBack}
          className="btn-link"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-accent)',
            cursor: 'pointer',
            fontSize: 'var(--type-caption-size)',
            padding: 0,
            alignSelf: 'flex-start',
          }}
        >
          <ChevronLeftRegular fontSize={16} />
          Projects
        </button>
        <h1
          style={{
            fontFamily: 'var(--font-family-display)',
            fontSize:   'var(--type-subtitle-size)',
            fontWeight: 'var(--type-subtitle-weight)',
            color:      'var(--color-text-primary)',
            margin:     0,
          }}
        >
          New project
        </h1>
      </header>

      <form
        onSubmit={(e) => void onSubmit(e)}
        noValidate
        style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}
      >
        <Card variant="default">
          {/* Section 1 — Project info */}
          <Field label="Project name" required error={errors.name}>
            <Input
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              invalid={!!errors.name}
              maxLength={100}
              autoFocus
            />
          </Field>
          <Field label="Client name" required error={errors.clientName}>
            <Input
              value={form.clientName}
              onChange={(e) => setField('clientName', e.target.value)}
              invalid={!!errors.clientName}
              maxLength={100}
            />
          </Field>
          <Field label="Description (optional)">
            <Textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              rows={3}
              style={{ minHeight: 72 }}
              maxLength={500}
            />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Field label="Start date" required error={errors.startDate}>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setField('startDate', e.target.value)}
                invalid={!!errors.startDate}
              />
            </Field>
          </div>

          <CardDivider />

          {/* Section 2 — Configuration */}
          <Field label="Template" required error={errors.templateId}>
            <Dropdown
              options={tplOptions}
              value={form.templateId}
              onChange={(e) => setField('templateId', e.target.value)}
              aria-invalid={!!errors.templateId || undefined}
            />
          </Field>
          <Field label="Branding" required error={errors.brandingProfileId}>
            <Dropdown
              options={brandOptions}
              value={form.brandingProfileId}
              onChange={(e) => setField('brandingProfileId', e.target.value)}
              aria-invalid={!!errors.brandingProfileId || undefined}
            />
          </Field>
          <Field
            label="Naming pattern"
            hint={
              <span
                className="mono"
                style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)' }}
              >
                Preview: {preview || '—'}
              </span>
            }
          >
            <Input
              value={form.namingPattern}
              onChange={(e) => setField('namingPattern', e.target.value)}
            />
          </Field>
          <Field label="Storage folder" required error={errors.storagePath}>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Input
                value={form.storagePath}
                readOnly
                placeholder="No folder selected"
                style={{ flex: 1 }}
                invalid={!!errors.storagePath}
              />
              <Button
                type="button"
                variant="standard"
                startIcon={<FolderOpenRegular />}
                onClick={() => void pickFolder()}
              >
                Browse
              </Button>
            </div>
          </Field>
        </Card>

        {submitError && (
          <div
            role="alert"
            style={{
              marginTop:    'var(--space-3)',
              padding:      'var(--space-2) var(--space-3)',
              border:       '1px solid var(--color-text-danger)',
              borderRadius: 'var(--radius-card)',
              color:        'var(--color-text-danger)',
              fontSize:     'var(--type-caption-size)',
            }}
          >
            {submitError}
          </div>
        )}

        <footer
          style={{
            display:      'flex',
            justifyContent: 'flex-end',
            gap:          'var(--space-2)',
            marginTop:    'var(--space-4)',
          }}
        >
          <Button type="button" variant="subtle" onClick={goBack} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="accent"
            disabled={submitting}
            startIcon={submitting ? <ProgressRing size={16} /> : undefined}
          >
            Create project
          </Button>
        </footer>
      </form>
    </div>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string | undefined;
  hint?: React.ReactNode;
  children: React.ReactNode;
}

function Field({ label, required, error, hint, children }: FieldProps): JSX.Element {
  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <label
        style={{
          display:    'block',
          fontSize:   'var(--type-caption-size)',
          fontWeight: 'var(--type-body-strong-weight)',
          color:      'var(--color-text-primary)',
          marginBottom: 'var(--space-1)',
        }}
      >
        {label}
        {required && <span style={{ color: 'var(--color-text-danger)' }}> *</span>}
      </label>
      {children}
      {error && (
        <div
          role="alert"
          style={{
            marginTop: 'var(--space-1)',
            fontSize:  'var(--type-caption-size)',
            color:     'var(--color-text-danger)',
          }}
        >
          {error}
        </div>
      )}
      {hint && !error && (
        <div style={{ marginTop: 'var(--space-1)' }}>{hint}</div>
      )}
    </div>
  );
}
