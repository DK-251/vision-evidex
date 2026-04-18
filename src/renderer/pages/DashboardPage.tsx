import { useEffect, useState } from 'react';
import type { MetricsSummary, RecentProject } from '@shared/types/entities';
import {
  CameraRegular,
  AddRegular,
  ArrowUploadRegular,
  DocumentTextRegular,
  FolderRegular,
  SparkleRegular,
} from '@fluentui/react-icons';
import { Button, Card, FluentSkeleton } from '../components/ui';

/**
 * S-03 — Dashboard. Port of the D25 page to doc §15 S-03.
 * Three zones: metric cards, quick actions, recent projects.
 * Session-active side card is gated on real SessionService which lands
 * in Phase 2 Wk7 — omitted here rather than rendered as a stub.
 */

export function DashboardPage(): JSX.Element {
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [recent, setRecent] = useState<RecentProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      const [summaryResult, recentResult] = await Promise.all([
        window.evidexAPI.dashboard.summary(),
        window.evidexAPI.dashboard.recentProjects(),
      ]);
      if (cancelled) return;
      if (!summaryResult.ok) {
        setError(`metrics: ${summaryResult.error.message}`);
        return;
      }
      if (!recentResult.ok) {
        setError(`recent projects: ${recentResult.error.message}`);
        return;
      }
      setSummary(summaryResult.data);
      setRecent(recentResult.data);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="shell-content-column"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}
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
          style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)' }}
        >
          No session active
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
        <Button variant="standard" startIcon={<CameraRegular />}       style={{ justifyContent: 'flex-start' }}>New session</Button>
        <Button variant="standard" startIcon={<AddRegular />}          style={{ justifyContent: 'flex-start' }}>New project</Button>
        <Button variant="standard" startIcon={<ArrowUploadRegular />}  style={{ justifyContent: 'flex-start' }}>Import metrics</Button>
        <Button variant="standard" startIcon={<DocumentTextRegular />} style={{ justifyContent: 'flex-start' }}>Recent reports</Button>
      </section>

      <RecentProjectsSection recent={recent} />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div
      style={{
        background:    'var(--color-fill-subtle)',
        borderRadius:  'var(--radius-card)',
        padding:       'var(--space-4)',
      }}
    >
      <div
        style={{
          fontSize:    'var(--type-caption-size)',
          color:       'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily:  'var(--font-family-display)',
          fontSize:    'var(--type-title-size)',
          fontWeight:  'var(--type-title-weight)',
          lineHeight:  'var(--type-title-height)',
          color:       'var(--color-text-primary)',
          marginTop:   'var(--space-1)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MetricCardSkeleton(): JSX.Element {
  return (
    <div
      style={{
        background:   'var(--color-fill-subtle)',
        borderRadius: 'var(--radius-card)',
        padding:      'var(--space-4)',
      }}
    >
      <FluentSkeleton height={12} width={96} />
      <div style={{ marginTop: 'var(--space-2)' }}>
        <FluentSkeleton height={28} width={56} />
      </div>
    </div>
  );
}

function RecentProjectsSection({ recent }: { recent: RecentProject[] | null }): JSX.Element {
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
        <a
          href="#view-all"
          onClick={(e) => e.preventDefault()}
          style={{
            fontSize:       'var(--type-caption-size)',
            color:          'var(--color-accent-default)',
            textDecoration: 'none',
          }}
        >
          View all
        </a>
      </div>

      {recent === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <FluentSkeleton height={48} />
          <FluentSkeleton height={48} />
          <FluentSkeleton height={48} />
        </div>
      ) : recent.length === 0 ? (
        <EmptyProjectsState />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {recent.map((p) => (
            <li key={p.projectId} className="recent-project-row">
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
                  {p.filePath}
                </div>
              </div>
              <time
                dateTime={p.lastOpenedAt}
                style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-tertiary)' }}
              >
                {p.lastOpenedAt.slice(0, 10)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function EmptyProjectsState(): JSX.Element {
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
      <Button variant="accent" startIcon={<AddRegular />}>
        Create project
      </Button>
    </div>
  );
}
