import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { pageForward } from '../components/animations';
import {
  AddRegular,
  FolderRegular,
  FolderAddRegular,
} from '@fluentui/react-icons';
import { Button, Card, FluentSkeleton } from '../components/ui';
import { useNavStore } from '../stores/nav-store';
import { useProjectStore } from '../stores/project.store';
import { useToast } from '../providers/ToastProvider';
import type { RecentProject } from '@shared/types/entities';

/**
 * S-13 (Docs §15) — Project list. Post-onboarding home page (AQ5).
 *
 * Lists recent projects from app.db and offers the create-project CTA.
 * Click a row → openProject → navigate to project-overview (W9). Empty state
 * shows the "no projects yet" hero with the Create CTA.
 */

export function ProjectListPage(): JSX.Element {
  const navigate = useNavStore((s) => s.navigate);
  const { showToast } = useToast();
  const recent = useProjectStore((s) => s.recentProjects);
  const isLoading = useProjectStore((s) => s.isLoading);
  const loadRecent = useProjectStore((s) => s.loadRecent);
  const openProject = useProjectStore((s) => s.openProject);

  // Lazy-load on first render. Subsequent navigations re-use the
  // already-populated array (zustand keeps it in memory).
  useEffect(() => {
    void loadRecent();
    // Always load fresh on mount to catch projects created in other sessions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleOpen(project: RecentProject): Promise<void> {
    try {
      await openProject(project.filePath);
      // Navigate to ProjectOverviewPage (W9) — the user chose a project,
      // show them the overview with session cards and a New Session CTA.
      navigate('project-overview', { projectId: project.projectId });
    } catch (err) {
      showToast('error', 'Could not open project', err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <motion.div
      variants={pageForward}
      initial="initial"
      animate="animate"
      className="shell-content-column"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-family-display)',
              fontSize:   'var(--type-title-size)',
              fontWeight: 'var(--type-title-weight)',
              lineHeight: 'var(--type-title-height)',
              color:      'var(--color-text-primary)',
              margin:     0,
            }}
          >
            Projects
          </h1>
          <p
            style={{
              fontSize: 'var(--type-body-size)',
              color:    'var(--color-text-secondary)',
              margin:   'var(--space-1) 0 0',
            }}
          >
            Open a recent project or create a new one to start capturing.
          </p>
        </div>
        <Button
          variant="accent"
          startIcon={<AddRegular />}
          onClick={() => navigate('create-project')}
        >
          New project
        </Button>
      </header>

      <Card variant="default">
        <h2
          style={{
            fontSize:    'var(--type-caption-size)',
            fontWeight:  'var(--type-body-strong-weight)',
            color:       'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            margin:        '0 0 var(--space-3)',
          }}
        >
          Recent
        </h2>

        {isLoading ? (
          <RecentRowsSkeleton />
        ) : recent.length === 0 ? (
          <EmptyState onCreate={() => navigate('create-project')} />
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {recent.map((p) => (
              <li key={p.projectId}>
                <button
                  type="button"
                  className="recent-project-row"
                  onClick={() => void handleOpen(p)}
                  style={{
                    width:      '100%',
                    background: 'none',
                    border:     'none',
                    padding:    'var(--space-2) var(--space-3)',
                    cursor:     'pointer',
                    textAlign:  'left',
                  }}
                >
                  <span style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} aria-hidden>
                    <FolderRegular fontSize={20} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize:     'var(--type-body-strong-size)',
                        fontWeight:   'var(--type-body-strong-weight)',
                        color:        'var(--color-text-primary)',
                        overflow:     'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace:   'nowrap',
                      }}
                    >
                      {p.name}
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize:     'var(--type-caption-size)',
                        color:        'var(--color-text-secondary)',
                        overflow:     'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace:   'nowrap',
                      }}
                    >
                      {p.clientName || p.filePath.split('\\').pop()?.replace('.evidex', '') || p.filePath}
                    </div>
                  </div>
                  <time
                    dateTime={p.lastOpenedAt}
                    style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-tertiary)' }}
                  >
                    {p.lastOpenedAt.slice(0, 10)}
                  </time>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </motion.div>
  );
}

function RecentRowsSkeleton(): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <FluentSkeleton height={48} />
      <FluentSkeleton height={48} />
      <FluentSkeleton height={48} />
      <FluentSkeleton height={48} />
      <FluentSkeleton height={48} />
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }): JSX.Element {
  return (
    <div
      style={{
        textAlign:     'center',
        padding:       'var(--space-12) var(--space-4)',
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           'var(--space-3)',
      }}
    >
      <span style={{ color: 'var(--color-text-tertiary)' }} aria-hidden>
        <FolderAddRegular fontSize={48} />
      </span>
      <div>
        <div
          style={{
            fontSize:   'var(--type-subtitle-size)',
            fontWeight: 'var(--type-subtitle-weight)',
            lineHeight: 'var(--type-subtitle-height)',
            color:      'var(--color-text-primary)',
          }}
        >
          No projects yet
        </div>
        <div
          style={{
            fontSize:  'var(--type-body-size)',
            color:     'var(--color-text-secondary)',
            marginTop: 'var(--space-1)',
          }}
        >
          Create a project to start capturing evidence.
        </div>
      </div>
      <Button variant="accent" startIcon={<AddRegular />} onClick={onCreate}>
        Create project
      </Button>
    </div>
  );
}
