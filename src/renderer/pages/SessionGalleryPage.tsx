import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeftRegular, EditRegular } from '@fluentui/react-icons';
import type {
  Session,
  SessionStatus,
  StatusTag,
  CaptureResult,
} from '@shared/types/entities';
import { useNavStore } from '../stores/nav-store';
import { useSessionStore } from '../stores/session.store';
import { Button } from '../components/ui/Button';
import { StatusBadge, type StatusTagKind } from '../components/ui/StatusBadge';
import { CaptureThumbnail } from '../components/ui/CaptureThumbnail';
import { GallerySkeleton } from '../components/ui/GallerySkeleton';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { pageForward, fadeIn } from '../components/animations';

/**
 * S-06 Session Gallery (Docs §15). Header + summary bar + thumbnail grid
 * + slide-in detail panel. Captures are sourced from
 * `useSessionStore().captures`; hotkey-driven captures arrive through
 * the `capture:arrived` IPC event and are appended live.
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

  // Rules-of-hooks: keep ALL hooks above the early-return guard below.
  const openedCapture = useMemo(
    () => captures.find((c) => c.captureId === openCaptureId) ?? null,
    [captures, openCaptureId]
  );

  if (!projectId || !sessionId) return null;

  const isActive = session !== null && session.endedAt === undefined;
  const detailVariants = reducedMotion ? fadeIn : pageForward;

  return (
    <div className="gallery-shell">
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

      <main className="gallery-main">
        <header className="gallery-header">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back to sessions"
            className="gallery-header__crumb"
          >
            <ChevronLeftRegular fontSize={20} />
            <span>Sessions</span>
          </button>
          <h1 className="gallery-header__title">
            {session?.testId ?? sessionId}
          </h1>
          {isActive && (
            <span className="gallery-header__live-pill" aria-live="polite">
              Live
            </span>
          )}
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

        <div className="gallery-summary" role="group" aria-label="Capture counts">
          <SummaryTile kind="pass"    label="Pass"    value={counts.passCount} />
          <SummaryTile kind="fail"    label="Fail"    value={counts.failCount} />
          <SummaryTile kind="blocked" label="Blocked" value={counts.blockedCount} />
          <SummaryTile kind="total"   label="Total"   value={counts.captureCount} />
        </div>

        {selectedIds.size > 0 && (
          <div className="gallery-selection-bar" role="region" aria-label="Selection">
            <span>{selectedIds.size} selected</span>
            <Button variant="subtle" size="compact" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        )}

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

      <AnimatePresence>
        {openCaptureId && openedCapture && (
          <motion.aside
            key="capture-detail"
            variants={detailVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="detail-panel"
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

interface SummaryTileProps {
  kind:  'pass' | 'fail' | 'blocked' | 'total';
  label: string;
  value: number;
}

function SummaryTile({ kind, label, value }: SummaryTileProps): JSX.Element {
  return (
    <div className={`gallery-summary-tile gallery-summary-tile--${kind}`}>
      <span className="gallery-summary-tile__label">{label}</span>
      <span className="gallery-summary-tile__value">{value}</span>
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

function EmptyState(): JSX.Element {
  return (
    <div className="gallery-empty">
      <div className="gallery-empty__title">No captures yet</div>
      <div className="gallery-empty__hint">
        Press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>1</kbd> for fullscreen,{' '}
        <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>2</kbd> for the active window, or{' '}
        <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>3</kbd> to draw a region. The
        capture toolbar at the top of the screen does the same.
      </div>
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
    <div className="gallery-grid">
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

const TAG_OPTIONS: { tag: StatusTag; label: string }[] = [
  { tag: 'pass',     label: 'Pass' },
  { tag: 'fail',     label: 'Fail' },
  { tag: 'blocked',  label: 'Blocked' },
  { tag: 'skip',     label: 'Skip' },
  { tag: 'untagged', label: 'Clear' },
];

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

  async function setTag(tag: StatusTag): Promise<void> {
    if (saving || tag === currentTag) return;
    setSaving(true);
    try {
      await updateCaptureTag(capture.captureId, tag);
    } catch {
      /* Store handles optimistic revert. */
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="detail-panel__header">
        <h2 className="detail-panel__title">Capture detail</h2>
        <Button variant="subtle" size="compact" onClick={onClose}>Close</Button>
      </div>

      <div className="detail-panel__hero">
        {imgSrc && <img src={imgSrc} alt="" />}
        <div className="detail-panel__hero-status">
          <StatusBadge tag={currentTag as StatusTagKind} />
        </div>
      </div>

      <div className="detail-panel__body">
        <dl className="detail-panel__meta">
          <dt>Filename</dt>
          <dd>{capture.filename}</dd>
          <dt>Captured</dt>
          <dd className="normal">{new Date(capture.capturedAt).toLocaleString()}</dd>
          <dt>Hash</dt>
          <dd title={capture.sha256Hash}>…{capture.sha256Hash.slice(-12)}</dd>
          <dt>Size</dt>
          <dd className="normal">{(capture.fileSizeBytes / 1024).toFixed(1)} KB</dd>
        </dl>

        <div>
          <div className="detail-panel__section-label">Status</div>
          <div className="tag-picker" role="radiogroup" aria-label="Capture status">
            {TAG_OPTIONS.map(({ tag, label }) => {
              const selected = tag === currentTag;
              return (
                <button
                  key={tag}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={saving}
                  onClick={() => void setTag(tag)}
                  className={`tag-picker__option tag-picker__option--${tag} ${selected ? 'selected' : ''}`.trim()}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="detail-panel__actions">
        <Button
          variant="accent"
          startIcon={<EditRegular />}
          onClick={() => {
            void window.evidexAPI.capture.openAnnotation(capture.captureId);
          }}
        >
          Annotate
        </Button>
        <Button variant="subtle" onClick={onClose}>Close</Button>
      </div>
    </>
  );
}
