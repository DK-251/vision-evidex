import { useState, useEffect, useMemo, type FormEvent } from 'react';
import type { Session, SessionIntakeInput } from '@shared/types/entities';
import { Modal, ModalTitle, ModalActions } from '../ui/Modal';
import { Input, Textarea } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { Button } from '../ui/Button';
import { ProgressRing } from '../ui/ProgressRing';
import { useSessionStore } from '../../stores/session.store';

/**
 * S-04 SessionIntakeModal (Docs §15). 560 px modal that creates a session
 * and resolves to the new `Session` on success. Composed on top of the
 * existing `Modal` primitive (which already wraps `dialogEnter` +
 * `fadeIn` per §5.8). Validation runs on SUBMIT ONLY — never on blur.
 */

export interface SessionIntakeModalProps {
  projectId:    string;
  projectName:  string;
  /** Default tester name from settings.user.name. */
  testerNameDefault?: string;
  /** Environment options from settings.environments. Empty = manual entry. */
  environmentOptions?: ReadonlyArray<string>;
  onSuccess: (session: Session) => void;
  onCancel:  () => void;
}

interface FormState {
  testId:               string;
  testName:             string;
  scenario:             string;
  testDataMatrix:       string;
  requirementId:        string;
  requirementDesc:      string;
  environment:          string;
  applicationUnderTest: string;
  testerName:           string;
}

interface FieldErrors {
  testId?:               string;
  testName?:             string;
  scenario?:             string;
  applicationUnderTest?: string;
  environment?:          string;
}

const TITLE_ID = 'session-intake-title';

export function SessionIntakeModal({
  projectId,
  projectName,
  testerNameDefault = '',
  environmentOptions = [],
  onSuccess,
  onCancel,
}: SessionIntakeModalProps): JSX.Element {
  const startSession = useSessionStore((s) => s.startSession);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showDataMatrix, setShowDataMatrix] = useState(false);
  const [discardPrompt, setDiscardPrompt] = useState(false);

  const [form, setForm] = useState<FormState>(() => ({
    testId:               '',
    testName:             '',
    scenario:             '',
    testDataMatrix:       '',
    requirementId:        '',
    requirementDesc:      '',
    environment:          environmentOptions[0] ?? '',
    applicationUnderTest: '',
    testerName:           testerNameDefault,
  }));
  const [errors, setErrors] = useState<FieldErrors>({});

  const today = useMemo(() => new Date(), []);
  const todayIso = today.toISOString().slice(0, 10);
  const todayDisplay = today.toLocaleDateString();

  // Track whether the user has touched any field — drives the
  // "Discard changes?" prompt on cancel.
  const isDirty = useMemo(
    () =>
      form.testId !== '' ||
      form.testName !== '' ||
      form.scenario !== '' ||
      form.testDataMatrix !== '' ||
      form.requirementId !== '' ||
      form.requirementDesc !== '' ||
      form.applicationUnderTest !== '' ||
      // testerName diverges from default = dirty
      form.testerName !== testerNameDefault ||
      (environmentOptions.length === 0
        ? form.environment !== ''
        : form.environment !== (environmentOptions[0] ?? '')),
    [form, testerNameDefault, environmentOptions]
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((s) => ({ ...s, [key]: value }));
    if (errors[key as keyof FieldErrors]) {
      setErrors((e) => ({ ...e, [key]: undefined }));
    }
  }

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (form.testId.trim() === '')                e.testId = 'Required';
    if (form.testName.trim() === '')              e.testName = 'Required';
    if (form.scenario.trim() === '')              e.scenario = 'Required';
    if (form.applicationUnderTest.trim() === '')  e.applicationUnderTest = 'Required';
    if (form.environment.trim() === '')           e.environment = 'Required';
    return e;
  }

  async function onSubmit(ev: FormEvent<HTMLFormElement>): Promise<void> {
    ev.preventDefault();
    if (submitting) return;
    const v = validate();
    if (Object.keys(v).length > 0) {
      setErrors(v);
      // Scroll the first invalid field into view if off-screen.
      const firstKey = Object.keys(v)[0];
      if (firstKey) {
        const el = document.getElementById(`session-intake-${firstKey}`);
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        el?.focus();
      }
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const intake: SessionIntakeInput = {
        projectId,
        testId:               form.testId.trim(),
        testName:             form.testName.trim(),
        scenario:             form.scenario.trim(),
        ...(form.testDataMatrix.trim() !== '' ? { testDataMatrix: form.testDataMatrix.trim() } : {}),
        ...(form.requirementId.trim() !== ''  ? { requirementId:  form.requirementId.trim() } : {}),
        ...(form.requirementDesc.trim() !== '' ? { requirementDesc: form.requirementDesc.trim() } : {}),
        environment:          form.environment.trim(),
        testerName:           form.testerName.trim() || testerNameDefault,
        applicationUnderTest: form.applicationUnderTest.trim(),
      };
      const session = await startSession(intake);
      onSuccess(session);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  function attemptCancel(): void {
    if (submitting) return;
    if (isDirty) {
      setDiscardPrompt(true);
      return;
    }
    onCancel();
  }

  // Escape key — Modal handles it via onClose. Wire it to attemptCancel.
  useEffect(() => {
    setSubmitError(null);
  }, []);

  const dropdownOptions = useMemo(
    () => environmentOptions.map((e) => ({ value: e, label: e })),
    [environmentOptions]
  );

  return (
    <>
      <Modal open={!discardPrompt} onClose={attemptCancel} ariaLabelledBy={TITLE_ID}>
        <ModalTitle id={TITLE_ID}>New session</ModalTitle>
        <div
          style={{
            fontSize: 'var(--type-caption-size)',
            color:    'var(--color-text-secondary)',
            marginBottom: 'var(--space-4)',
          }}
        >
          {projectName}
        </div>
        <hr className="card-divider" />

        <form onSubmit={onSubmit} noValidate>
          {/* Row 1: Test ID | Test Name */}
          <div style={ROW_2COL}>
            <Field label="Test ID" required error={errors.testId}>
              <Input
                id="session-intake-testId"
                value={form.testId}
                onChange={(e) => setField('testId', e.target.value)}
                invalid={!!errors.testId}
                maxLength={100}
                autoFocus
              />
            </Field>
            <Field label="Test name" required error={errors.testName}>
              <Input
                id="session-intake-testName"
                value={form.testName}
                onChange={(e) => setField('testName', e.target.value)}
                invalid={!!errors.testName}
                maxLength={200}
              />
            </Field>
          </div>

          {/* Row 2: Scenario (full-width textarea) */}
          <Field label="Scenario" required error={errors.scenario}>
            <Textarea
              id="session-intake-scenario"
              value={form.scenario}
              onChange={(e) => setField('scenario', e.target.value)}
              invalid={!!errors.scenario}
              rows={3}
              style={{ minHeight: 72 }}
            />
          </Field>

          {/* Row 3: Test Data Matrix (collapsible) */}
          {showDataMatrix ? (
            <Field
              label="Test data matrix"
              hint={
                <button
                  type="button"
                  onClick={() => {
                    setShowDataMatrix(false);
                    setField('testDataMatrix', '');
                  }}
                  className="btn-link"
                  style={LINK_BTN}
                >
                  Remove
                </button>
              }
            >
              <Textarea
                id="session-intake-testDataMatrix"
                value={form.testDataMatrix}
                onChange={(e) => setField('testDataMatrix', e.target.value)}
                rows={3}
                placeholder="One row per data combination"
              />
            </Field>
          ) : (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <button
                type="button"
                onClick={() => setShowDataMatrix(true)}
                className="btn-link"
                style={LINK_BTN}
              >
                + Add test data
              </button>
            </div>
          )}

          {/* Row 4: Requirement ID (40%) | Requirement Description (60%) */}
          <div style={ROW_40_60}>
            <Field label="Requirement ID">
              <Input
                id="session-intake-requirementId"
                value={form.requirementId}
                onChange={(e) => setField('requirementId', e.target.value)}
              />
            </Field>
            <Field label="Requirement description">
              <Input
                id="session-intake-requirementDesc"
                value={form.requirementDesc}
                onChange={(e) => setField('requirementDesc', e.target.value)}
              />
            </Field>
          </div>

          {/* Row 5: Environment | App Under Test */}
          <div style={ROW_2COL}>
            <Field label="Environment" required error={errors.environment}>
              {dropdownOptions.length > 0 ? (
                <Dropdown
                  id="session-intake-environment"
                  options={dropdownOptions}
                  value={form.environment}
                  onChange={(e) => setField('environment', e.target.value)}
                  aria-invalid={!!errors.environment || undefined}
                />
              ) : (
                <Input
                  id="session-intake-environment"
                  value={form.environment}
                  onChange={(e) => setField('environment', e.target.value)}
                  invalid={!!errors.environment}
                  placeholder="e.g. UAT, SIT, Prod"
                />
              )}
            </Field>
            <Field label="App under test" required error={errors.applicationUnderTest}>
              <Input
                id="session-intake-applicationUnderTest"
                value={form.applicationUnderTest}
                onChange={(e) => setField('applicationUnderTest', e.target.value)}
                invalid={!!errors.applicationUnderTest}
              />
            </Field>
          </div>

          {/* Row 6: Tester Name | Date */}
          <div style={ROW_2COL}>
            <Field label="Tester name">
              <Input
                id="session-intake-testerName"
                value={form.testerName}
                onChange={(e) => setField('testerName', e.target.value)}
              />
            </Field>
            <Field label="Date">
              <Input
                id="session-intake-date"
                value={todayDisplay}
                readOnly
                aria-readonly="true"
                title={todayIso}
              />
            </Field>
          </div>

          {submitError && (
            <div
              role="alert"
              style={{
                fontSize: 'var(--type-caption-size)',
                color:    'var(--color-text-danger)',
                marginBottom: 'var(--space-3)',
              }}
            >
              {submitError}
            </div>
          )}

          <hr className="card-divider" />
          <ModalActions>
            <Button variant="subtle" type="button" onClick={attemptCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="accent" type="submit" disabled={submitting}>
              {submitting ? <ProgressRing size={16} /> : 'Start session'}
            </Button>
          </ModalActions>
        </form>
      </Modal>

      {/* Discard-changes prompt — second modal, also from the Modal primitive */}
      <Modal open={discardPrompt} onClose={() => setDiscardPrompt(false)}>
        <ModalTitle>Discard changes?</ModalTitle>
        <div className="modal-body">
          You have unsaved changes in this session intake. Discard and close?
        </div>
        <ModalActions>
          <Button variant="subtle" onClick={() => setDiscardPrompt(false)}>
            Continue editing
          </Button>
          <Button
            variant="accent"
            onClick={() => {
              setDiscardPrompt(false);
              onCancel();
            }}
          >
            Discard
          </Button>
        </ModalActions>
      </Modal>
    </>
  );
}

// ─── Small helpers (kept inline — used only here) ─────────────────────

const ROW_2COL: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 'var(--space-3)',
  marginBottom: 'var(--space-3)',
};

const ROW_40_60: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '40fr 60fr',
  gap: 'var(--space-3)',
  marginBottom: 'var(--space-3)',
};

const LINK_BTN: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: 0,
  color: 'var(--color-text-accent)',
  cursor: 'pointer',
  fontSize: 'var(--type-caption-size)',
};

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}

function Field({ label, required, error, hint, children }: FieldProps): JSX.Element {
  return (
    <label style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
      <span
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          fontSize: 'var(--type-caption-size)',
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--space-1)',
        }}
      >
        <span>
          {label}
          {required && <span style={{ color: 'var(--color-text-danger)' }}> *</span>}
        </span>
        {hint && <span>{hint}</span>}
      </span>
      {children}
      {error && (
        <span
          style={{
            display: 'block',
            fontSize: 'var(--type-caption-size)',
            color: 'var(--color-text-danger)',
            marginTop: 2,
          }}
        >
          {error}
        </span>
      )}
    </label>
  );
}
