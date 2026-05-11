import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { pageForward } from '../components/animations';
import {
  ChevronLeftRegular,
  AddRegular,
  SearchRegular,
  FilterRegular,
  ChevronRightRegular,
  ClockRegular,
  CalendarRegular,
  PersonRegular,
  AppsRegular,
  CheckmarkCircleFilled,
  RecordFilled,
} from '@fluentui/react-icons';
import type { Session } from '@shared/types/entities';
import { Button, Card, FluentSkeleton, Input } from '../components/ui';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useNavStore } from '../stores/nav-store';
import { useProjectStore } from '../stores/project.store';
import { useToast } from '../providers/ToastProvider';

/**
 * W9 \u2014 SessionListPage.
 * Full session history for a project with live search + status filter.
 */

type FilterState = 'all' | 'active' | 'completed';

export function SessionListPage(): JSX.Element | null {
  const projectId = useNavStore((s) => s.currentProjectId);
  const navigate = useNavStore((s) => s.navigate);
  const goBack = useNavStore((s) => s.goBack);
  const activeProject = useProjectStore((s) => s.activeProject);
  const { showToast } = useToast();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterState>('all');

  useEffect(() => {
    if (!projectId) { goBack(); return; }
    setLoading(true);
    void window.evidexAPI.session.list(projectId).then((res) => {
      if (res.ok) setSessions(res.data);
      else showToast('error', 'Could not load sessions', res.error.message);
      setLoading(false);
    });
  }, [projectId, goBack, showToast]);

  if (!projectId) return null;

  const filtered = sessions
    .filter((s) => {
      if (filter === 'active') return !s.endedAt;
      if (filter === 'completed') return !!s.endedAt;
      return true;
    })
    .filter((s) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        s.testId.toLowerCase().includes(q) ||
        s.testName.toLowerCase().includes(q) ||
        s.applicationUnderTest.toLowerCase().includes(q) ||
        s.testerName.toLowerCase().includes(q) ||
        (s.environment?.toLowerCase().includes(q) ?? false)
      );
    })
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const projectName = activeProject?.name ?? 'Project';

  return (
    <motion.div
      variants={pageForward}
      initial="initial"
      animate="animate"
      className="shell-content-column"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <header>
        <button
          type="button"
          className="btn-link"
          onClick={goBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 'var(--space-2)', fontSize: 'var(--type-caption-size)' }}
        >
          <ChevronLeftRegular fontSize={14} />
          {projectName}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
          <h1
            style={{
              fontFamily: 'var(--font-family-display)',
              fontSize: 'var(--type-title-size)',
              fontWeight: 'var(--type-title-weight)',
              lineHeight: 'var(--type-title-height)',
              color: 'var(--color-text-primary)',
              margin: 0,
            }}
          >
            Sessions
          </h1>
          <Button
            variant="accent"
            startIcon={<AddRegular />}
            onClick={() => navigate('session-intake', { projectId: projectId! })}
          >
            New session
          </Button>
        </div>
      </header>

      {/* ── Toolbar: search + filter ────────────────────────────── */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--color-text-secondary)', pointerEvents: 'none',
            display: 'flex', alignItems: 'center',
          }}>
            <SearchRegular fontSize={16} />
          </span>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by test ID, name, app\u2026"
            style={{ paddingLeft: 34 }}
          />
        </div>
        <div className="pivot-tabs" style={{ flexShrink: 0 }}>
          {(['all', 'active', 'completed'] as FilterState[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`pivot-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
              style={{ textTransform: 'capitalize' }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Session list ─────────────────────────────────────────── */}
      <Card variant="default" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {[1, 2, 3, 4, 5].map((i) => <FluentSkeleton key={i} height={64} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--type-body-size)' }}>
            {query || filter !== 'all' ? 'No sessions match your filter.' : 'No sessions yet.'}
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {filtered.map((session, i) => (
              <li
                key={session.id}
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-stroke-divider)' : 'none' }}
              >
                <SessionListRow
                  session={session}
                  onClick={() => navigate('session-detail', { projectId: projectId!, sessionId: session.id })}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ── Count footer ─────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)', textAlign: 'right' }}>
          {filtered.length} of {sessions.length} session{sessions.length !== 1 ? 's' : ''}
        </div>
      )}
    </motion.div>
  );
}

// ─── Session list row ──────────────────────────────────────────────────────

function SessionListRow({ session, onClick }: { session: Session; onClick: () => void }): JSX.Element {
  const isActive = !session.endedAt;
  const duration = session.endedAt
    ? formatDuration(Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000))
    : 'Active';

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr auto',
        alignItems: 'center',
        gap: 'var(--space-4)',
        width: '100%',
        background: 'none',
        border: 'none',
        padding: 'var(--space-3) var(--space-4)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background var(--duration-ultra-fast) var(--easing-standard)',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--color-fill-subtle)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
    >
      {/* Status icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isActive ? (
          <RecordFilled fontSize={20} style={{ color: 'var(--color-status-fail)' }} />
        ) : (
          <CheckmarkCircleFilled fontSize={20} style={{ color: 'var(--color-status-pass)' }} />
        )}
      </div>

      {/* Content */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-caption-size)', fontWeight: 600, color: 'var(--color-accent-default)' }}>
            {session.testId}
          </span>
          <span style={{ fontSize: 'var(--type-body-strong-size)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {session.testName}
          </span>
          {isActive && (
            <span style={{ fontSize: 'var(--type-caption-size)', fontWeight: 600, color: 'var(--color-text-danger)', background: 'var(--color-status-fail-bg)', padding: '1px 6px', borderRadius: 'var(--radius-pill)' }}>
              LIVE
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 3, flexWrap: 'wrap' }}>
          <Chip icon={<AppsRegular fontSize={12} />} label={session.applicationUnderTest} />
          <Chip icon={<PersonRegular fontSize={12} />} label={session.testerName} />
          <Chip icon={<CalendarRegular fontSize={12} />} label={session.startedAt.slice(0, 10)} />
          <Chip icon={<ClockRegular fontSize={12} />} label={duration} />
        </div>
      </div>

      {/* Stats + chevron */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
        {session.captureCount > 0 && (
          <span style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)' }}>
            {session.captureCount}
          </span>
        )}
        {session.passCount > 0 && <StatusBadge tag="pass">{session.passCount}</StatusBadge>}
        {session.failCount > 0 && <StatusBadge tag="fail">{session.failCount}</StatusBadge>}
        {session.blockedCount > 0 && <StatusBadge tag="blocked">{session.blockedCount}</StatusBadge>}
        <ChevronRightRegular fontSize={14} style={{ color: 'var(--color-text-tertiary)' }} />
      </div>
    </button>
  );
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }): JSX.Element {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)' }}>
      {icon}{label}
    </span>
  );
}

function formatDuration(totalSec: number): string {
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}
