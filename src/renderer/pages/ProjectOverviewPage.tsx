import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageForward, fadeIn } from '../components/animations';
import {
  ChevronLeftRegular,
  AddRegular,
  ImageMultipleFilled,
  ClockRegular,
  CheckmarkCircleRegular,
  DismissCircleRegular,
  RecordRegular,
  CalendarRegular,
  PersonRegular,
  AppsRegular,
  ChevronRightRegular,
  HistoryRegular,
} from '@fluentui/react-icons';
import type { Session } from '@shared/types/entities';
import { Button, Card, FluentSkeleton } from '../components/ui';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useNavStore } from '../stores/nav-store';
import { useProjectStore } from '../stores/project.store';
import { useToast } from '../providers/ToastProvider';

/**
 * W9 — ProjectOverviewPage (S-PM-02).
 *
 * Shows all sessions for the open project, grouped by `applicationUnderTest`.
 * Each application group is a card with its own session rows and aggregate
 * pass/fail counts. A prominent "New Session" CTA sits in the header.
 *
 * Session grouping satisfies Asus issue #9 from the pre-W9 manual test report.
 */

interface AppGroup {
  appName: string;
  sessions: Session[];
  totalCaptures: number;
  totalPass: number;
  totalFail: number;
  totalBlocked: number;
  lastActivity: string;
}

function groupByApp(sessions: Session[]): AppGroup[] {
  const map = new Map<string, Session[]>();
  for (const s of sessions) {
    const key = s.applicationUnderTest || 'Unknown Application';
    const existing = map.get(key) ?? [];
    existing.push(s);
    map.set(key, existing);
  }
  return [...map.entries()]
    .map(([appName, group]) => {
      const sorted = [...group].sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
      return {
        appName,
        sessions: sorted,
        totalCaptures: group.reduce((n, s) => n + s.captureCount, 0),
        totalPass: group.reduce((n, s) => n + s.passCount, 0),
        totalFail: group.reduce((n, s) => n + s.failCount, 0),
        totalBlocked: group.reduce((n, s) => n + s.blockedCount, 0),
        lastActivity: sorted[0]?.startedAt ?? '',
      };
    })
    .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
}

export function ProjectOverviewPage(): JSX.Element | null {
  const projectId = useNavStore((s) => s.currentProjectId);
  const navigate = useNavStore((s) => s.navigate);
  const goBack = useNavStore((s) => s.goBack);
  const activeProject = useProjectStore((s) => s.activeProject);
  const { showToast } = useToast();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) { goBack(); return; }
    setLoading(true);
    void window.evidexAPI.session.list(projectId).then((res) => {
      if (res.ok) setSessions(res.data);
      else showToast('error', 'Could not load sessions', res.error.message);
      setLoading(false);
    });
  }, [projectId, goBack, showToast]);

  const groups = useMemo(() => groupByApp(sessions), [sessions]);
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter((s) => !s.endedAt).length;

  if (!projectId) return null;

  const projectName = activeProject?.name ?? 'Project';
  const clientName = activeProject?.clientName ?? '';

  return (
    <motion.div
      variants={pageForward}
      initial="initial"
      animate="animate"
      className="shell-content-column"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <header>
        <button
          type="button"
          className="btn-link"
          onClick={goBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 'var(--space-2)', fontSize: 'var(--type-caption-size)' }}
        >
          <ChevronLeftRegular fontSize={14} />
          Projects
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
          <div>
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
              {projectName}
            </h1>
            {clientName && (
              <p style={{ fontSize: 'var(--type-body-size)', color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
                {clientName}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
            <Button
              variant="standard"
              startIcon={<HistoryRegular />}
              onClick={() => navigate('session-list', { projectId: projectId! })}
            >
              All sessions
            </Button>
            <Button
              variant="accent"
              startIcon={<AddRegular />}
              onClick={() => navigate('session-intake', { projectId: projectId! })}
            >
              New session
            </Button>
          </div>
        </div>
      </header>

      {/* ── Stats strip ──────────────────────────────────────────── */}
      <StatStrip
        total={totalSessions}
        active={activeSessions}
        loading={loading}
      />

      {/* ── Application groups ────────────────────────────────────── */}
      {loading ? (
        <LoadingSkeleton />
      ) : groups.length === 0 ? (
        <EmptyState onNewSession={() => navigate('session-intake', { projectId: projectId! })} />
      ) : (
        <AnimatePresence initial={false}>
          {groups.map((group, i) => (
            <motion.div
              key={group.appName}
              variants={fadeIn}
              initial="initial"
              animate="animate"
              transition={{ delay: i * 0.04 }}
            >
              <AppGroupCard
                group={group}
                onOpenSession={(sessionId) =>
                  navigate('session-detail', { projectId: projectId!, sessionId })
                }
                onNewSession={() =>
                  navigate('session-intake', { projectId: projectId! })
                }
              />
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </motion.div>
  );
}

// ─── Stats strip ──────────────────────────────────────────────────────────

function StatStrip({ total, active, loading }: { total: number; active: number; loading: boolean }): JSX.Element {
  const stats = [
    { label: 'Total sessions', value: total, icon: <ImageMultipleFilled fontSize={18} /> },
    { label: 'Active now', value: active, icon: <RecordRegular fontSize={18} />, accent: active > 0 },
    { label: 'Completed', value: total - active, icon: <CheckmarkCircleRegular fontSize={18} /> },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 'var(--space-3)',
    }}>
      {stats.map((s) => (
        <div
          key={s.label}
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-3) var(--space-4)',
          }}
        >
          <span style={{ color: s.accent ? 'var(--color-text-danger)' : 'var(--color-accent-default)', flexShrink: 0 }}>
            {s.icon}
          </span>
          <div>
            <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)' }}>
              {s.label}
            </div>
            <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 'var(--type-subtitle-size)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {loading ? '—' : s.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── App group card ────────────────────────────────────────────────────────

function AppGroupCard({
  group,
  onOpenSession,
  onNewSession,
}: {
  group: AppGroup;
  onOpenSession: (sessionId: string) => void;
  onNewSession: () => void;
}): JSX.Element {
  const [expanded, setExpanded] = useState(true);

  const passRate = group.totalCaptures > 0
    ? Math.round((group.totalPass / group.totalCaptures) * 100)
    : null;

  return (
    <Card variant="default" style={{ overflow: 'hidden' }}>
      {/* Card header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          width: '100%',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
          marginBottom: expanded ? 'var(--space-3)' : 0,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-card)',
            background: 'var(--color-fill-accent-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <AppsRegular fontSize={20} style={{ color: 'var(--color-accent-default)' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 'var(--type-body-strong-size)', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {group.appName}
          </div>
          <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {group.sessions.length} session{group.sessions.length !== 1 ? 's' : ''}
            {group.totalCaptures > 0 && ` · ${group.totalCaptures} captures`}
            {passRate !== null && ` · ${passRate}% pass`}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
          {group.totalPass > 0 && <StatusBadge tag="pass">{group.totalPass}</StatusBadge>}
          {group.totalFail > 0 && <StatusBadge tag="fail">{group.totalFail}</StatusBadge>}
          {group.totalBlocked > 0 && <StatusBadge tag="blocked">{group.totalBlocked}</StatusBadge>}
          <Button
            variant="subtle"
            size="compact"
            startIcon={<AddRegular />}
            onClick={(e) => { e.stopPropagation(); onNewSession(); }}
          >
            New
          </Button>
          <ChevronRightRegular
            fontSize={16}
            style={{
              color: 'var(--color-text-secondary)',
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform var(--duration-fast) var(--easing-standard)',
            }}
          />
        </div>
      </button>

      {/* Session rows */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.167, ease: [0.17, 0.17, 0, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ borderTop: '1px solid var(--color-stroke-divider)', marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)' }}>
              {group.sessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  onClick={() => onOpenSession(session.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ─── Session row ──────────────────────────────────────────────────────────

function SessionRow({ session, onClick }: { session: Session; onClick: () => void }): JSX.Element {
  const isActive = !session.endedAt;
  const duration = session.endedAt
    ? formatDuration(
        Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
      )
    : 'Active';

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        width: '100%',
        background: 'none',
        border: 'none',
        padding: `var(--space-2) var(--space-3)`,
        cursor: 'pointer',
        borderRadius: 'var(--radius-control)',
        textAlign: 'left',
        transition: 'background var(--duration-ultra-fast) var(--easing-standard)',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--color-fill-secondary)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
    >
      {/* Active indicator dot */}
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: isActive ? 'var(--color-status-fail)' : 'var(--color-stroke-default)',
          flexShrink: 0,
        }}
      />

      {/* Test ID + name */}
      <div style={{ flex: '0 0 auto', minWidth: 80 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-caption-size)', color: 'var(--color-accent-default)', fontWeight: 600 }}>
          {session.testId}
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--type-body-size)', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {session.testName}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 2, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)' }}>
            <PersonRegular fontSize={12} />
            {session.testerName}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)' }}>
            <CalendarRegular fontSize={12} />
            {session.startedAt.slice(0, 10)}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)' }}>
            <ClockRegular fontSize={12} />
            {duration}
          </span>
        </div>
      </div>

      {/* Counts */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexShrink: 0 }}>
        {session.captureCount > 0 && (
          <span style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)' }}>
            {session.captureCount} captures
          </span>
        )}
        {session.passCount > 0 && <StatusBadge tag="pass">{session.passCount}</StatusBadge>}
        {session.failCount > 0 && <StatusBadge tag="fail">{session.failCount}</StatusBadge>}
        {session.blockedCount > 0 && <StatusBadge tag="blocked">{session.blockedCount}</StatusBadge>}
        {isActive && (
          <span style={{
            fontSize: 'var(--type-caption-size)',
            fontWeight: 600,
            color: 'var(--color-text-danger)',
            background: 'var(--color-status-fail-bg)',
            padding: '1px 6px',
            borderRadius: 'var(--radius-pill)',
          }}>
            LIVE
          </span>
        )}
      </div>

      <ChevronRightRegular fontSize={14} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
    </button>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────

function EmptyState({ onNewSession }: { onNewSession: () => void }): JSX.Element {
  return (
    <div style={{
      textAlign: 'center',
      padding: 'var(--space-12) var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--space-4)',
    }}>
      <div style={{
        width: 72, height: 72,
        borderRadius: 'var(--radius-circle)',
        background: 'var(--color-fill-accent-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <ImageMultipleFilled fontSize={36} style={{ color: 'var(--color-accent-default)' }} />
      </div>
      <div>
        <div style={{ fontSize: 'var(--type-subtitle-size)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          No sessions yet
        </div>
        <div style={{ fontSize: 'var(--type-body-size)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Start your first session to begin capturing evidence.
        </div>
      </div>
      <Button variant="accent" startIcon={<AddRegular />} onClick={onNewSession}>
        Start first session
      </Button>
    </div>
  );
}

// ─── Loading skeleton ──────────────────────────────────────────────────────

function LoadingSkeleton(): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {[1, 2].map((i) => (
        <div key={i} className="card" style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <FluentSkeleton width={40} height={40} borderRadius="var(--radius-card)" />
            <div style={{ flex: 1 }}>
              <FluentSkeleton width={200} height={16} />
              <FluentSkeleton width={140} height={12} style={{ marginTop: 6 }} />
            </div>
          </div>
          <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {[1, 2, 3].map((j) => (
              <FluentSkeleton key={j} height={40} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────

function formatDuration(totalSec: number): string {
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}
