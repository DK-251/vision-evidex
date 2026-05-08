import { useEffect, useState } from 'react';
import type { Settings, Session } from '@shared/types/entities';
import { useNavStore } from '../stores/nav-store';
import { useProjectStore } from '../stores/project.store';
import { SessionIntakeModal } from '../components/modals/SessionIntakeModal';
import { ProgressRing } from '../components/ui';

/**
 * S-04 route wrapper. The modal IS the page — when it closes successfully
 * we navigate the gallery; when cancelled we go back. Project name now
 * resolves from `useProjectStore.activeProject` (Wk 8 closes the
 * pre-Wk8 'Active Project' stub).
 */

export function SessionIntakePage(): JSX.Element | null {
  const projectId = useNavStore((s) => s.currentProjectId);
  const navigate = useNavStore((s) => s.navigate);
  const goBack = useNavStore((s) => s.goBack);
  const activeProject = useProjectStore((s) => s.activeProject);

  // Pull tester-name default from settings so the form pre-fills sensibly.
  const [settings, setSettings] = useState<Settings | null>(null);
  useEffect(() => {
    let cancelled = false;
    void window.evidexAPI.settings.get().then((res) => {
      if (cancelled) return;
      if (res.ok) setSettings(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // No project selected → bounce back. Defensive guard for a direct
  // navigate('session-intake') without a projectId in params.
  useEffect(() => {
    if (!projectId) goBack();
  }, [projectId, goBack]);

  if (!projectId) return null;

  // Don't render the modal until settings resolve — the tester name
  // pre-fill uses useState initialiser which only runs once. If we render
  // before settings arrive the field is permanently blank.
  if (!settings) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 'var(--space-3)',
      color: 'var(--color-text-secondary)', fontSize: 'var(--type-caption-size)',
    }}>
      <ProgressRing size={20} />
      Loading session defaults…
    </div>
  );

  // Resolve from the open project; the fallback covers the brief window
  // after onboarding where the user hits the hotkey before opening one.
  const projectName = activeProject?.name ?? 'Active Project';
  const testerNameDefault = settings?.profile?.name ?? '';

  return (
    <SessionIntakeModal
      projectId={projectId}
      projectName={projectName}
      testerNameDefault={testerNameDefault}
      onSuccess={(session: Session) =>
        navigate('session-gallery', { projectId, sessionId: session.id })
      }
      onCancel={goBack}
    />
  );
}
