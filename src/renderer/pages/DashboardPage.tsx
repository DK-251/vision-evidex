import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { pageForward } from '../components/animations';
import type { MetricsSummary, RecentProject } from '@shared/types/entities';
import type { Page } from '../stores/nav-store';
import {
  CameraRegular,
  AddRegular,
  ArrowUploadRegular,
  DocumentTextRegular,
  FolderRegular,
  SparkleRegular,
  PlayCircleRegular,
} from '@fluentui/react-icons';
import { Button, Card, FluentSkeleton } from '../components/ui';
import { useNavStore } from '../stores/nav-store';
import { useProjectStore } from '../stores/project.store';
import { useSessionStore } from '../stores/session.store';
import { useToast } from '../providers/ToastProvider';

/**
 * S-03 — Dashboard. Port of the D25 page to doc §15 S-03.
 * Three zones: metric cards, quick actions, recent projects.
 * Session-active side card is gated on real SessionService which lands
 * in Phase 2 Wk7 — omitted here rather than rendered as a stub.
 */

export function DashboardPage(): JSX.Element {
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Wk 8 — recent projects come from useProjectStore so a project
  // created elsewhere reflects without remounting the dashboard.
  const recent = useProjectStore((s) => s.recentProjects);
  const loadRecent = useProjectStore((s) => s.loadRecent);
  const openProject = useProjectStore((s) => s.openProject);
  const activeProjectId = useProjectStore((s) => s.activeProject?.id);
  const navigate = useNavStore((s) => s.navigate);
  const { showToast } = useToast();
  const [recentLoaded, setRecentLoaded] = useState(false);
  // DB-05 — session active indicator
  const activeSession = useSessionStore((s) => s.activeSession);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      const summaryResult = await window.evidexAPI.dashboard.summary();
      if (cancelled) return;
      if (!summaryResult.ok) {
        setError(`metrics: ${summaryResult.error.message}`);
        return;
      }
      setSummary(summaryResult.data);
      // Project recent-list lives in the store — load once on first
      // dashboard mount; subsequent visits use the cached array.
      await loadRecent();
      if (cancelled) return;
      setRecentLoaded(true);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [loadRecent]);

  async function handleOpen(p: RecentProject): Promise<void> {
    try {
      await openProject(p.filePath);
      // Navigate to ProjectOverviewPage (W9).
      navigate('project-overview', { projectId: p.projectId });
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
              fontFamily:   'var(--font-family-display)',
              fontSize:     'var(--type-title-size)',
              fontWeight:   'var(--type-title-weight)',
              lineHeight:   'var(--type-title-height)',
              color:        'var(--color-text-primary)',
              margin:       0,
            }}
          >
            Dashboard
          </h1>
          <p
            style={{
              fontSize: 'var(--type-body-size)',
              color:    'var(--color-text-secondary)',
              margin:   'var(--space-1) 0 0',
            }}
          >
            Vision-EviDex overview
          </p>
        </div>
        <span
          className="mono"
          style={{
            fontSize: 'var(--type-caption-size)',
            color: activeSession ? 'var(--color-text-danger)' : 'var(--color-text-secondary)',
            background: activeSession ? 'var(--color-status-fail-bg, rgba(196,43,28,0.1))' : 'transparent',
            padding: activeSession ? '2px 8px' : undefined,
            borderRadius: activeSession ? 'var(--radius-pill)' : undefined,
            fontWeight: activeSession ? 600 : undefined,
          }}
        >
          {activeSession ? `Session active — ${activeSession.testId}` : 'No session active'}
        </span>
      </header>

      {error && (
        <div
          role="alert"
          style={{
            border:       '1px solid var(--color-text-danger)',
            borderRadius: 'var(--radius-card)',
            padding:      'var(--space-3) var(--space-4)',
            color:        'var(--color-text-danger)',
            fontSize:     'var(--type-body-size)',
          }}
        >
          Failed to load dashboard: {error}
        </div>
      )}

      <section
        aria-label="Key metrics"
        style={{
          display:            'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap:                'var(--space-3)',
        }}
      >
        {summary === null ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard label="Active projects"     value={summary.activeProjects} />
            <MetricCard label="Sessions today"      value={summary.sessionsToday} />
            <MetricCard label="Captures this week"  value={summary.capturesThisWeek} />
            <MetricCard label="Exports this week"   value={summary.exportsThisWeek} />
          </>
        )}
      </section>

      <section
        aria-label="Quick actions"
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap:                 'var(--space-2)',
        }}
      >
        <Button variant="standard" startIcon={<CameraRegular />}
          style={{ justifyContent: 'flex-start' }}
          onClick={() => {
            const id = activeProjectId ?? recent[0]?.projectId;
            if (id) navigate('session-intake', { projectId: id });
            else navigate('create-project');
          }}
        >New session</Button>
        <Button variant="standard" startIcon={<AddRegular />}
          style={{ justifyContent: 'flex-start' }}
          onClick={() => navigate('create-project')}
        >New project</Button>
        <Button variant="standard" startIcon={<ArrowUploadRegular />}
          style={{ justifyContent: 'flex-start' }}
          disabled
          title="Available in Phase 3 — Metrics Import"
        >Import metrics</Button>
        <Button variant="standard" startIcon={<DocumentTextRegular />}
          style={{ justifyContent: 'flex-start' }}
          disabled
          title="Available in Phase 3 — Report Builder"
        >Recent reports</Button>
        {/* DB-04 — Quick Tour replays onboarding walkthrough */}
        <Button variant="standard" startIcon={<PlayCircleRegular />}
          style={{ justifyContent: 'flex-start' }}
          onClick={() => navigate('settings')}
          title="Replay the onboarding walkthrough"
        >Quick Tour</Button>
      </section>

      <RecentProjectsSection
        recent={recentLoaded ? recent : null}
        onOpen={(p) => void handleOpen(p)}
        navigate={navigate}
      />
    </motion.div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="metric-card">
      <div className="metric-card-label">{label}</div>
      <div className="metric-card-value">{value}</div>
    </div>
  );
}

function MetricCardSkeleton(): JSX.Element {
  return (
    <div className="metric-card">
      <FluentSkeleton height={12} width={96} />
      <div style={{ marginTop: 'var(--space-2)' }}>
        <FluentSkeleton height={28} width={56} />
      </div>
    </div>
  );
}

function RecentProjectsSection({
  recent,
  onOpen,
  navigate,
}: {
  recent: RecentProject[] | null;
  onOpen: (p: RecentProject) => void;
  navigate: (page: Page, params?: { projectId?: string; sessionId?: string }) => void;
}): JSX.Element {
  return (
    <Card variant="default">
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   'var(--space-3)',
        }}
      >
        <h2
          style={{
            fontSize:   'var(--type-body-strong-size)',
            fontWeight: 'var(--type-body-strong-weight)',
            color:      'var(--color-text-primary)',
            margin:     0,
          }}
        >
          Recent projects
        </h2>
        <button
          type="button"
          className="btn-link"
          onClick={() => navigate('project-list')}
          style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-accent-default)' }}
        >
          View all
        </button>
      </div>

      {recent === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <FluentSkeleton height={48} />
          <FluentSkeleton height={48} />
          <FluentSkeleton height={48} />
        </div>
      ) : recent.length === 0 ? (
        <EmptyProjectsState navigate={navigate} />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {recent.slice(0, 5).map((p) => (
            <li key={p.projectId}>
              <button
                type="button"
                className="recent-project-row"
                onClick={() => onOpen(p)}
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
                  <FolderRegular fontSize={16} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize:     'var(--type-body-size)',
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
  );
}

function EmptyProjectsState({ navigate }: { navigate: (page: Page) => void }): JSX.Element {
  return (
    <div
      style={{
        textAlign:       'center',
        padding:         'var(--space-12) var(--space-4)',
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        gap:             'var(--space-3)',
      }}
    >
      <span style={{ color: 'var(--color-text-tertiary)' }} aria-hidden>
        <SparkleRegular fontSize={48} />
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
          Welcome to Vision-EviDex
        </div>
        <div
          style={{
            fontSize:  'var(--type-body-size)',
            color:     'var(--color-text-secondary)',
            marginTop: 'var(--space-1)',
          }}
        >
          Create your first project to start capturing evidence.
        </div>
      </div>
      <Button variant="accent" startIcon={<AddRegular />} onClick={() => navigate('create-project')}>
        Create project
      </Button>
    </div>
  );
}
