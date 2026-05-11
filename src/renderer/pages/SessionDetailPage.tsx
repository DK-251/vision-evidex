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

          {/* Capture grid */}
          {loadingCaptures ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <FluentSkeleton key={i} width={160} height={110} borderRadius="var(--radius-card)" />
              ))}
            </div>
          ) : captures.length === 0 ? (
            <div style={{
              padding: 'var(--space-8)',
              border: '1px dashed var(--color-stroke-default)',
              borderRadius: 'var(--radius-card)',
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--type-body-size)',
            }}>
              No captures in this session.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
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
              style={{
                width: 320,
                flexShrink: 0,
                background: 'var(--color-layer-1)',
                border: '1px solid var(--color-stroke-default)',
                borderRadius: 'var(--radius-card)',
                padding: 'var(--space-4)',
                alignSelf: 'flex-start',
                position: 'sticky',
                top: 'var(--space-4)',
              }}
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
  const [thumbError, setThumbError] = useState(false);

  // Load thumbnail lazily on first render
  useEffect(() => {
    let cancelled = false;
    setThumbLoading(true);
    void window.evidexAPI.capture.getThumbnail(capture.id).then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) setThumbnail(res.data);
      else setThumbError(true);
      setThumbLoading(false);
    });
    return () => { cancelled = true; };
  }, [capture.id]);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 160,
        flexShrink: 0,
        borderRadius: 'var(--radius-card)',
        border: isSelected
          ? '2px solid var(--color-accent-default)'
          : '1px solid var(--color-stroke-default)',
        overflow: 'hidden',
        cursor: 'pointer',
        background: 'var(--color-layer-1)',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        transition: 'border-color var(--duration-ultra-fast) var(--easing-standard)',
        boxShadow: isSelected ? '0 0 0 2px var(--color-fill-accent-subtle)' : 'none',
      }}
    >
      {/* Thumbnail area */}
      <div style={{
        width: '100%',
        aspectRatio: '16 / 9',
        background: 'var(--color-fill-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {thumbnail ? (
          <img src={thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : thumbLoading ? (
          <FluentSkeleton width="100%" height="100%" />
        ) : (
          <ImageRegular fontSize={24} style={{ color: 'var(--color-text-tertiary)' }} />
        )}
        {/* Sequence badge */}
        <div style={{
          position: 'absolute',
          top: 4,
          left: 4,
          background: 'rgba(0,0,0,0.55)',
          color: '#fff',
          fontSize: 10,
          fontWeight: 600,
          padding: '1px 5px',
          borderRadius: 3,
          fontFamily: 'var(--font-mono)',
        }}>
          #{sequenceNum}
        </div>
        {/* Selected checkmark */}
        {isSelected && (
          <div style={{
            position: 'absolute',
            top: 4,
            right: 4,
            background: 'var(--color-accent-default)',
            borderRadius: '50%',
            width: 18,
            height: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <CheckmarkFilled fontSize={12} style={{ color: '#fff' }} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center' }}>
        <StatusBadge tag={capture.statusTag as StatusTagKind} />
      </div>
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <h2 style={{ fontSize: 'var(--type-subtitle-size)', fontWeight: 600, margin: 0 }}>
          Capture #{capture.sequenceNum}
        </h2>
        <Button variant="subtle" size="compact" onClick={onClose}>Close</Button>
      </div>

      {/* Metadata */}
      <dl style={{
        fontSize: 'var(--type-caption-size)',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        columnGap: 'var(--space-3)',
        rowGap: 4,
        margin: '0 0 var(--space-3)',
      }}>
        <dt style={{ color: 'var(--color-text-secondary)' }}>Filename</dt>
        <dd style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          {capture.originalFilename}
        </dd>
        <dt style={{ color: 'var(--color-text-secondary)' }}>Captured</dt>
        <dd style={{ margin: 0 }}>{capture.capturedAt.slice(0, 16).replace('T', ' ')}</dd>
        <dt style={{ color: 'var(--color-text-secondary)' }}>Hash</dt>
        <dd style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 11 }}>…{capture.sha256Hash.slice(-8)}</dd>
        <dt style={{ color: 'var(--color-text-secondary)' }}>Size</dt>
        <dd style={{ margin: 0 }}>{(capture.fileSizeBytes / 1024).toFixed(1)} KB</dd>
        <dt style={{ color: 'var(--color-text-secondary)' }}>Mode</dt>
        <dd style={{ margin: 0 }}>{capture.captureMode}</dd>
      </dl>

      {/* Tag picker */}
      <div style={{ marginBottom: 'var(--space-3)' }}>
        <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
          Status tag
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {TAG_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              disabled={saving}
              onClick={() => onTagChange(tag)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 2,
                cursor: saving ? 'not-allowed' : 'pointer',
                borderRadius: 'var(--radius-pill)',
                outline: tag === capture.statusTag ? '2px solid var(--color-accent-default)' : 'none',
                outlineOffset: 2,
                opacity: saving ? 0.6 : 1,
              }}
            >
              <StatusBadge tag={tag as StatusTagKind} />
            </button>
          ))}
        </div>
      </div>

      {/* Notes placeholder */}
      <div style={{
        padding: 'var(--space-3)',
        background: 'var(--color-fill-subtle)',
        borderRadius: 'var(--radius-card)',
        fontSize: 'var(--type-caption-size)',
        color: 'var(--color-text-secondary)',
        textAlign: 'center',
      }}>
        Notes editing \u2014 coming in Phase 2 Wk 10
      </div>
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
