import { useEffect, useState } from 'react';
import type { Settings, Session } from '@shared/types/entities';
import { useNavStore } from '../stores/nav-store';
import { SessionIntakeModal } from '../components/modals/SessionIntakeModal';

/**
 * S-04 route wrapper. The modal IS the page — when it closes successfully
 * we navigate the gallery; when cancelled we go back. Project name is
 * stubbed until project.store.ts ships in Phase 2 Wk 8 (PH2-ROUTING /
 * project-open work tracked in BACKLOG).
 */

export function SessionIntakePage(): JSX.Element | null {
  const projectId = useNavStore((s) => s.currentProjectId);
  const navigate = useNavStore((s) => s.navigate);
  const goBack = useNavStore((s) => s.goBack);

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

  const projectName = 'Active Project'; // STUB — Phase 2 Wk 8 project.store
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
