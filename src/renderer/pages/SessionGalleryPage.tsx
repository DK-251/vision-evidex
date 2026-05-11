import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeftRegular } from '@fluentui/react-icons';
import type {
  Session,
  SessionStatus,
  StatusTag,
  CaptureResult,
} from '@shared/types/entities';
import { useNavStore } from '../stores/nav-store';
import { useSessionStore } from '../stores/session.store';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CaptureThumbnail } from '../components/ui/CaptureThumbnail';
import { GallerySkeleton } from '../components/ui/GallerySkeleton';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { pageForward, fadeIn } from '../components/animations';

/**
 * S-06 Session Gallery (Docs §15). Header + summary bar + thumbnail grid
 * + slide-in detail panel.
 *
 * Capture-arrival path is intentionally unwired this sprint. Captures
 * shown here come from the in-memory `useSessionStore().captures` array,
 * populated when a renderer-driven capture call resolves. Hotkey-driven
 * captures (main → globalShortcut → CaptureService) wire up in Phase 2
 * Wk 8 alongside Project-open. Empty state is the expected D34 result.
 */

export function SessionGalleryPage(): JSX.Element | null {
  const projectId = useNavStore((s) => s.currentProjectId);
  const sessionId = useNavStore((s) => s.currentSessionId);
  const navigate = useNavStore((s) => s.navigate);
  const goBack = useNavStore((s) => s.goBack);

  const captures = useSessionStore((s) => s.captures);
  const activeSession = useSessionStore((s) => s.activeSession);
  const endSession = useSessionStore((s) => s.endSession);

  const [session, setSession] = useState<Session | null>(activeSession);
  const [loading, setLoading] = useState<boolean>(activeSession === null);
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openCaptureId, setOpenCaptureId] = useState<string | null>(null);
  const [endingSession, setEndingSession] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  const reducedMotion = useReducedMotion();

  // Bounce back if the route was hit without params.
  useEffect(() => {
    if (!projectId || !sessionId) goBack();
  }, [projectId, sessionId, goBack]);

  // Fetch the session row from the main process if the store didn't have
  // it already (e.g. coming back to the gallery from settings).
  useEffect(() => {
    let cancelled = false;
    if (!sessionId) return;
    if (activeSession && activeSession.id === sessionId) {
      setSession(activeSession);
      setLoading(false);
      return;
    }
    setLoading(true);
    void window.evidexAPI.session.get(sessionId).then((res) => {
      if (cancelled) return;
      if (res.ok) setSession(res.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId, activeSession]);

  // Live counter — main pushes SESSION_STATUS_UPDATE on capture/end.
  useEffect(() => {
    const off = window.evidexAPI.events.onSessionStatusUpdate((next) => {
      if (next.sessionId === sessionId) setStatus(next);
    });
    return off;
  }, [sessionId]);

  // Flash visual on capture — brief 80 ms white overlay on the gallery.
  useEffect(() => {
    const off = window.evidexAPI.events.onCaptureFlash(() => {
      setFlashOn(true);
      window.setTimeout(() => setFlashOn(false), 80);
    });
    return off;
  }, []);

  const counts = useMemo(() => {
    // Always derive pass/fail/blocked from the live in-memory captures array
    // so summary bar counts update immediately when a tag is changed.
    // captureCount uses the status push when available (more authoritative
    // for the total) but tag counts always come from the local array.
    const derived = derivedCounts(captures);
    const captureCount = status?.captureCount ?? session?.captureCount ?? derived.captureCount;
    return {
      sessionId:    sessionId ?? '',
      captureCount,
      passCount:    derived.passCount,
      failCount:    derived.failCount,
      blockedCount: derived.blockedCount,
    };
  }, [status, session, captures, sessionId]);

  function onThumbClick(id: string): void {
    setOpenCaptureId(id);
  }

  function onShiftClick(id: string): void {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleEndSession(): Promise<void> {
    if (endingSession) return;
    setEndingSession(true);
    try {
      await endSession();
      // Navigate to project-list after session ends (not dashboard).
      navigate('project-list', { ...(projectId ? { projectId } : {}) });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('endSession failed', err);
      setEndingSession(false);
    }
  }

  if (!projectId || !sessionId) return null;

  const isActive = session !== null && session.endedAt === undefined;
  const detailVariants = reducedMotion ? fadeIn : pageForward;

  const openedCapture = useMemo(
    () => captures.find((c) => c.captureId === openCaptureId) ?? null,
    [captures, openCaptureId]
  );

  return (
    <div style={{ position: 'relative', display: 'flex', gap: 'var(--space-4)' }}>
      {flashOn && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: '#FFFFFF',
            opacity: 0.6,
            pointerEvents: 'none',
            zIndex: 30,
          }}
        />
      )}

      <main style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <button
            type="button"
            onClick={goBack}
            aria-label="Back to sessions"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: 'var(--type-body-size)',
            }}
          >
            <ChevronLeftRegular fontSize={20} />
            <span>Sessions</span>
          </button>
          <h1
            style={{
              fontFamily: 'var(--font-family-display)',
              fontSize: 'var(--type-subtitle-size)',
              fontWeight: 'var(--type-subtitle-weight)',
              color: 'var(--color-text-primary)',
              margin: 0,
              flex: 1,
            }}
          >
            {session?.testId ?? sessionId}
          </h1>
          {isActive ? (
            <Button variant="standard" onClick={handleEndSession} disabled={endingSession}>
              {endingSession ? 'Ending…' : 'End session'}
            </Button>
          ) : session?.endedAt ? (
            <span style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)' }}>
              Ended {new Date(session.endedAt).toLocaleString()}
            </span>
          ) : null}
        </header>

        {/* Summary bar */}
        <div
          style={{
            height: 36,
            background: 'var(--color-fill-subtle)',
            borderRadius: 'var(--radius-card)',
            padding: '0 var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-4)',
            fontSize: 'var(--type-caption-size)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <StatusBadge tag="pass">{counts.passCount} pass</StatusBadge>
          <Dot />
          <StatusBadge tag="fail">{counts.failCount} fail</StatusBadge>
          <Dot />
          <StatusBadge tag="blocked">{counts.blockedCount} blocked</StatusBadge>
          <Dot />
          <span style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)' }}>
            {counts.captureCount} total
          </span>
          {selectedIds.size > 0 && (
            <>
              <span style={{ marginLeft: 'auto', color: 'var(--color-text-primary)' }}>
                {selectedIds.size} selected
              </span>
              <Button variant="subtle" size="compact" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </>
          )}
        </div>

        {/* Thumbnail grid */}
        {loading ? (
          <GallerySkeleton count={8} />
        ) : captures.length === 0 ? (
          <EmptyState />
        ) : (
          <ThumbnailGrid
            captures={captures}
            selectedIds={selectedIds}
            openCaptureId={openCaptureId}
            onClick={onThumbClick}
            onShiftClick={onShiftClick}
            reducedMotion={reducedMotion}
          />
        )}
      </main>

      {/* Detail panel */}
      <AnimatePresence>
        {openCaptureId && openedCapture && (
          <motion.aside
            key="capture-detail"
            variants={detailVariants}
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
            }}
          >
            <DetailPanel
              capture={openedCapture}
              onClose={() => setOpenCaptureId(null)}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── helpers ───────────────────────────────────────────────────────────

function derivedCounts(captures: CaptureResult[]): {
  captureCount: number; passCount: number; failCount: number; blockedCount: number;
} {
  // CaptureResult now carries statusTag (GAP-T1). Derive all counts from the
  // in-memory array so the summary bar reflects live tagging immediately.
  return {
    captureCount: captures.length,
    passCount:    captures.filter((c) => c.statusTag === 'pass').length,
    failCount:    captures.filter((c) => c.statusTag === 'fail').length,
    blockedCount: captures.filter((c) => c.statusTag === 'blocked').length,
  };
}

function Dot(): JSX.Element {
  return <span aria-hidden="true">·</span>;
}

function EmptyState(): JSX.Element {
  return (
    <div
      style={{
        padding: 'var(--space-6)',
        border: '1px dashed var(--color-stroke-default)',
        borderRadius: 'var(--radius-card)',
        textAlign: 'center',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--type-body-size)',
      }}
    >
      No captures yet. Press the capture hotkey or use the toolbar to take the
      first screenshot of this session.
    </div>
  );
}

interface ThumbnailGridProps {
  captures:      CaptureResult[];
  selectedIds:   Set<string>;
  openCaptureId: string | null;
  onClick:       (id: string) => void;
  onShiftClick:  (id: string) => void;
  reducedMotion: boolean;
}

function ThumbnailGrid({
  captures, selectedIds, openCaptureId, onClick, onShiftClick, reducedMotion,
}: ThumbnailGridProps): JSX.Element {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
      {captures.map((c, i) => (
        <motion.div
          key={c.captureId}
          initial={reducedMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reducedMotion ? 0 : 0.167,
            delay:    reducedMotion ? 0 : i * 0.03,
            ease:     [0.10, 0.90, 0.20, 1],
          }}
        >
          <CaptureThumbnail
            capture={c}
            sequenceNum={i + 1}
            isSelected={selectedIds.has(c.captureId) || c.captureId === openCaptureId}
            onClick={onClick}
            onShiftClick={onShiftClick}
          />
        </motion.div>
      ))}
    </div>
  );
}

// ─── useThumbnailUrl ──────────────────────────────────────────────────

function useThumbnailUrl(thumbnail: CaptureResult['thumbnail']): string {
  const [src, setSrc] = useState('');
  useEffect(() => {
    if (typeof thumbnail === 'string' && thumbnail.length > 0) {
      setSrc(thumbnail);
      return;
    }
    setSrc('');
    return;
  }, [thumbnail]);
  return src;
}

function DetailPanel({
  capture,
  onClose,
}: {
  capture: CaptureResult;
  onClose: () => void;
}): JSX.Element {
  const updateCaptureTag = useSessionStore((s) => s.updateCaptureTag);
  const [saving, setSaving] = useState(false);
  const imgSrc = useThumbnailUrl(capture.thumbnail);

  const currentTag: StatusTag = capture.statusTag ?? 'untagged';
  const tags: StatusTag[] = ['pass', 'fail', 'blocked', 'skip', 'untagged'];

  async function setTag(tag: StatusTag): Promise<void> {
    if (saving) return;
    setSaving(true);
    try {
      await updateCaptureTag(capture.captureId, tag);
    } catch {
      // Optimistic revert handled inside the store; just stop the spinner.
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <h2 style={{ fontSize: 'var(--type-subtitle-size)', margin: 0 }}>Capture detail</h2>
        <Button variant="subtle" size="compact" onClick={onClose}>Close</Button>
      </div>

      {imgSrc && (
        <img
          src={imgSrc}
          alt=""
          style={{
            width: '100%',
            aspectRatio: '16/9',
            objectFit: 'cover',
            borderRadius: 'var(--radius-card)',
            marginBottom: 'var(--space-3)',
          }}
        />
      )}

      <dl style={{ fontSize: 'var(--type-caption-size)', display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 'var(--space-2)', rowGap: 4, margin: 0, marginBottom: 'var(--space-3)' }}>
        <dt style={{ color: 'var(--color-text-secondary)' }}>Filename</dt>
        <dd style={{ margin: 0 }}>{capture.filename}</dd>
        <dt style={{ color: 'var(--color-text-secondary)' }}>Captured</dt>
        <dd style={{ margin: 0 }}>{new Date(capture.capturedAt).toLocaleString()}</dd>
        <dt style={{ color: 'var(--color-text-secondary)' }}>Hash</dt>
        <dd style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--type-caption-size)' }}>…{capture.sha256Hash.slice(-8)}</dd>
        <dt style={{ color: 'var(--color-text-secondary)' }}>Size</dt>
        <dd style={{ margin: 0 }}>{(capture.fileSizeBytes / 1024).toFixed(1)} KB</dd>
      </dl>

      <div style={{ marginBottom: 'var(--space-3)' }}>
        <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
          Status
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => void setTag(tag)}
              disabled={saving}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 2,
                cursor: 'pointer',
                borderRadius: 'var(--radius-pill)',
                outline: tag === currentTag ? '2px solid var(--color-accent-default)' : 'none',
                outlineOffset: 2,
              }}
            >
              <StatusBadge tag={tag} />
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-3)' }}>
        <Button variant="standard" disabled>
          Open in annotation editor
        </Button>
        <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Notes and annotation editing land in Phase 2 Wk 9 — SessionDetailPage.
        </div>
      </div>
    </div>
  );
}
