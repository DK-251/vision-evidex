import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageForward, fadeIn } from '../components/animations';
import {
  ChevronLeftRegular,
  CalendarRegular,
  PersonRegular,
  GlobeRegular,
  AppsRegular,
  DocumentBulletListRegular,
  TagRegular,
  ChevronRightRegular,
  ImageRegular,
  CheckmarkFilled,
} from '@fluentui/react-icons';
import type { Capture, Session, StatusTag } from '@shared/types/entities';
import { Button, Card, FluentSkeleton } from '../components/ui';
import { StatusBadge, type StatusTagKind } from '../components/ui/StatusBadge';
import { useNavStore } from '../stores/nav-store';
import { useToast } from '../providers/ToastProvider';

/**
 * W9 \u2014 SessionDetailPage.
 * Historical session viewer: all captures for a past session, lazy
 * thumbnail loading, tag editing, and session metadata.
 *
 * Thumbnails are loaded one-at-a-time via `capture:thumbnail` IPC so
 * the main process extracts each JPEG from the .evidex container on demand.
 * This avoids loading all images upfront for large sessions.
 */

const TAG_OPTIONS: StatusTag[] = ['pass', 'fail', 'blocked', 'skip', 'untagged'];
const TAG_LABEL: Record<StatusTag, string> = {
  pass:     'Pass',
  fail:     'Fail',
  blocked:  'Blocked',
  skip:     'Skip',
  untagged: 'Clear',
};

export function SessionDetailPage(): JSX.Element | null {
  const projectId = useNavStore((s) => s.currentProjectId);
  const sessionId = useNavStore((s) => s.currentSessionId);
  const navigate = useNavStore((s) => s.navigate);
  const goBack = useNavStore((s) => s.goBack);
  const { showToast } = useToast();

  const [session, setSession] = useState<Session | null>(null);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingCaptures, setLoadingCaptures] = useState(true);
  const [openCaptureId, setOpenCaptureId] = useState<string | null>(null);
  const [savingTag, setSavingTag] = useState<string | null>(null);

  // Load session metadata
  useEffect(() => {
    if (!sessionId) { goBack(); return; }
    setLoadingSession(true);
    void window.evidexAPI.session.get(sessionId).then((res) => {
      if (res.ok && res.data) setSession(res.data);
      else if (!res.ok) showToast('error', 'Could not load session', res.error.message);
      setLoadingSession(false);
    });
  }, [sessionId, goBack, showToast]);

  // Load captures
  useEffect(() => {
    if (!sessionId) return;
    setLoadingCaptures(true);
    void window.evidexAPI.capture.list(sessionId).then((res) => {
      if (res.ok) setCaptures(res.data);
      else showToast('error', 'Could not load captures', res.error.message);
      setLoadingCaptures(false);
    });
  }, [sessionId, showToast]);

  const handleTagUpdate = useCallback(async (captureId: string, tag: StatusTag) => {
    setSavingTag(captureId);
    try {
      const prev = captures;
      setCaptures((cs) => cs.map((c) => c.id === captureId ? { ...c, statusTag: tag } : c));
      const res = await window.evidexAPI.capture.updateTag(captureId, tag);
      if (!res.ok) {
        setCaptures(prev);
        showToast('error', 'Tag update failed', res.error.message);
      }
    } finally {
      setSavingTag(null);
    }
  }, [captures, showToast]);

  const openCapture = useMemo(
    () => captures.find((c) => c.id === openCaptureId) ?? null,
    [captures, openCaptureId]
  );

  const counts = useMemo(() => ({
    pass:    captures.filter((c) => c.statusTag === 'pass').length,
    fail:    captures.filter((c) => c.statusTag === 'fail').length,
    blocked: captures.filter((c) => c.statusTag === 'blocked').length,
    skip:    captures.filter((c) => c.statusTag === 'skip').length,
    total:   captures.length,
  }), [captures]);

  if (!sessionId || !projectId) return null;

  const isActive = session ? !session.endedAt : false;

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
          Sessions
        </button>

        {loadingSession ? (
          <FluentSkeleton height={36} width={320} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
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
                  {session?.testId ?? sessionId}
                </h1>
                {isActive && (
                  <span style={{
                    fontSize: 'var(--type-caption-size)',
                    fontWeight: 600,
                    color: 'var(--color-text-danger)',
                    background: 'var(--color-status-fail-bg)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                  }}>
                    LIVE
                  </span>
                )}
              </div>
              {session?.testName && (
                <p style={{ fontSize: 'var(--type-body-size)', color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
                  {session.testName}
                </p>
              )}
            </div>
            {isActive && (
              <Button
                variant="accent"
                onClick={() => navigate('session-gallery', { projectId: projectId!, sessionId: sessionId! })}
              >
                Open live view
              </Button>
            )}
          </div>
        )}
      </header>

      {/* ── Two-column layout: captures grid + detail panel ──────── */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>

        {/* Left: metadata + capture grid */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

          {/* Session metadata card */}
          {session && (
            <SessionMetaCard session={session} counts={counts} />
          )}

          {/* Summary bar */}
          {!loadingCaptures && captures.length > 0 && (
            <div style={{
              height: 40,
              background: 'var(--color-fill-subtle)',
              borderRadius: 'var(--radius-card)',
              padding: '0 var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
            }}>
              <StatusBadge tag="pass">{counts.pass} pass</StatusBadge>
              <span style={{ color: 'var(--color-text-tertiary)' }}>·</span>
              <StatusBadge tag="fail">{counts.fail} fail</StatusBadge>
              <span style={{ color: 'var(--color-text-tertiary)' }}>·</span>
              <StatusBadge tag="blocked">{counts.blocked} blocked</StatusBadge>
              <span style={{ color: 'var(--color-text-tertiary)' }}>·</span>
              <span style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)' }}>
                {counts.total} total
              </span>
            </div>
          )}

          {loadingCaptures ? (
            <div className="gallery-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <FluentSkeleton key={i} width="100%" height={140} borderRadius="var(--radius-card)" />
              ))}
            </div>
          ) : captures.length === 0 ? (
            <div className="gallery-empty">
              <div className="gallery-empty__title">No captures in this session</div>
              <div className="gallery-empty__hint">
                Open an active session and use the capture hotkeys to add evidence.
              </div>
            </div>
          ) : (
            <div className="gallery-grid">
              {captures.map((capture, i) => (
                <motion.div
                  key={capture.id}
                  variants={fadeIn}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: i * 0.02 }}
                >
                  <HistoricalCaptureTile
                    capture={capture}
                    sequenceNum={capture.sequenceNum}
                    isSelected={capture.id === openCaptureId}
                    onClick={() => setOpenCaptureId((prev) => prev === capture.id ? null : capture.id)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Right: detail panel (slide in) */}
        <AnimatePresence>
          {openCapture && (
            <motion.aside
              key="detail"
              variants={pageForward}
              initial="initial"
              animate="animate"
              exit="exit"
              className="detail-panel"
              style={{ position: 'sticky', top: 'var(--space-4)' }}
            >
              <CaptureDetailPanel
                capture={openCapture}
                saving={savingTag === openCapture.id}
                onTagChange={(tag) => void handleTagUpdate(openCapture.id, tag)}
                onClose={() => setOpenCaptureId(null)}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Session metadata card ─────────────────────────────────────────────────

function SessionMetaCard({ session, counts }: { session: Session; counts: { total: number } }): JSX.Element {
  const duration = session.endedAt
    ? formatDuration(Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000))
    : 'Active';

  return (
    <Card variant="default">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
        <MetaItem icon={<AppsRegular fontSize={16} />} label="Application" value={session.applicationUnderTest} />
        <MetaItem icon={<GlobeRegular fontSize={16} />} label="Environment" value={session.environment} />
        <MetaItem icon={<PersonRegular fontSize={16} />} label="Tester" value={session.testerName} />
        <MetaItem icon={<CalendarRegular fontSize={16} />} label="Started" value={session.startedAt.slice(0, 16).replace('T', ' ')} />
        {session.endedAt && (
          <MetaItem icon={<CalendarRegular fontSize={16} />} label="Ended" value={session.endedAt.slice(0, 16).replace('T', ' ')} />
        )}
        <MetaItem icon={<TagRegular fontSize={16} />} label="Duration" value={duration} />
        {session.scenario && (
          <MetaItem icon={<DocumentBulletListRegular fontSize={16} />} label="Scenario" value={session.scenario} />
        )}
        {session.requirementId && (
          <MetaItem icon={<DocumentBulletListRegular fontSize={16} />} label="Requirement" value={session.requirementId} />
        )}
      </div>
    </Card>
  );
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }): JSX.Element {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)', marginBottom: 2 }}>
        {icon}{label}
      </div>
      <div style={{ fontSize: 'var(--type-body-size)', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </div>
    </div>
  );
}

// ─── Capture tile (lazy thumbnail) ────────────────────────────────────────

function HistoricalCaptureTile({
  capture,
  sequenceNum,
  isSelected,
  onClick,
}: {
  capture: Capture;
  sequenceNum: number;
  isSelected: boolean;
  onClick: () => void;
}): JSX.Element {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [thumbLoading, setThumbLoading] = useState(false);

  // Load thumbnail lazily on first render. A null result (no payload OR
  // !ok) falls through to the `ImageRegular` placeholder in the render —
  // the user sees "missing thumb" without a separate error UI.
  useEffect(() => {
    let cancelled = false;
    setThumbLoading(true);
    void window.evidexAPI.capture.getThumbnail(capture.id).then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) setThumbnail(res.data);
      setThumbLoading(false);
    });
    return () => { cancelled = true; };
  }, [capture.id]);

  // Same visual contract as `CaptureThumbnail` — uses the shared
  // `.capture-thumbnail` family so light/dark and high-contrast inherit
  // from the design system. The lazy thumbnail load is the only thing
  // unique to this tile (the gallery's variant gets a pre-baked
  // data-URL on capture; historical sessions fetch via IPC on demand).
  return (
    <button
      type="button"
      onClick={onClick}
      className={`capture-thumbnail ${isSelected ? 'selected' : ''}`.trim()}
      aria-pressed={isSelected}
      aria-label={`Capture #${sequenceNum} — ${capture.statusTag}`}
    >
      {thumbnail ? (
        <img className="capture-thumbnail-img" src={thumbnail} alt="" />
      ) : thumbLoading ? (
        <FluentSkeleton width="100%" height="100%" />
      ) : (
        <div
          className="capture-thumbnail-img"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-tertiary)',
          }}
        >
          <ImageRegular fontSize={24} />
        </div>
      )}

      <span className="capture-thumbnail__seq-badge" aria-hidden="true">
        #{sequenceNum}
      </span>

      {isSelected && (
        <span className="capture-thumbnail__check-badge" aria-hidden="true">
          <CheckmarkFilled fontSize={14} />
        </span>
      )}

      <span className="capture-thumbnail-footer">
        <StatusBadge tag={capture.statusTag as StatusTagKind} />
      </span>
    </button>
  );
}

// ─── Capture detail panel ──────────────────────────────────────────────────

function CaptureDetailPanel({
  capture,
  saving,
  onTagChange,
  onClose,
}: {
  capture: Capture;
  saving: boolean;
  onTagChange: (tag: StatusTag) => void;
  onClose: () => void;
}): JSX.Element {
  return (
    <>
      <div className="detail-panel__header">
        <h2 className="detail-panel__title">Capture #{capture.sequenceNum}</h2>
        <Button variant="subtle" size="compact" onClick={onClose}>Close</Button>
      </div>

      <div className="detail-panel__body">
        <dl className="detail-panel__meta">
          <dt>Filename</dt>
          <dd>{capture.originalFilename}</dd>
          <dt>Captured</dt>
          <dd className="normal">{capture.capturedAt.slice(0, 16).replace('T', ' ')}</dd>
          <dt>Hash</dt>
          <dd title={capture.sha256Hash}>…{capture.sha256Hash.slice(-12)}</dd>
          <dt>Size</dt>
          <dd className="normal">{(capture.fileSizeBytes / 1024).toFixed(1)} KB</dd>
          <dt>Mode</dt>
          <dd className="normal">{capture.captureMode}</dd>
        </dl>

        <div>
          <div className="detail-panel__section-label">Status</div>
          <div className="tag-picker" role="radiogroup" aria-label="Capture status">
            {TAG_OPTIONS.map((tag) => {
              const selected = tag === capture.statusTag;
              return (
                <button
                  key={tag}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={saving}
                  onClick={() => onTagChange(tag)}
                  className={`tag-picker__option tag-picker__option--${tag} ${selected ? 'selected' : ''}`.trim()}
                >
                  {TAG_LABEL[tag]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="detail-panel__actions">
        <Button
          variant="accent"
          onClick={() => {
            void window.evidexAPI.capture.openAnnotation(capture.id);
          }}
        >
          Annotate
        </Button>
        <Button variant="subtle" onClick={onClose}>Close</Button>
      </div>
    </>
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
