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

  const [session,       setSession]       = useState<Session | null>(activeSession);
  const [loading,       setLoading]       = useState<boolean>(activeSession === null);
  const [historicCaptures, setHistoricCaptures] = useState<CaptureResult[]>([]); // SG-NEW-01
  const [status,        setStatus]        = useState<SessionStatus | null>(null);
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [openCaptureId, setOpenCaptureId] = useState<string | null>(null);
  const [endingSession, setEndingSession] = useState(false);
  const [flashOn,       setFlashOn]       = useState(false);

  const reducedMotion = useReducedMotion();

  // Bounce back if the route was hit without params.
  useEffect(() => {
    if (!projectId || !sessionId) goBack();
  }, [projectId, sessionId, goBack]);

  // Fetch the session row + captures for non-active sessions (SG-NEW-01).
  useEffect(() => {
    let cancelled = false;
    if (!sessionId) return;
    if (activeSession && activeSession.id === sessionId) {
      setSession(activeSession);
      setHistoricCaptures([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // SG-NEW-01: load both session metadata AND its captures for ended sessions.
    void Promise.all([
      window.evidexAPI.session.get(sessionId),
      window.evidexAPI.capture.list(sessionId),
    ]).then(([sessionRes, captureRes]) => {
      if (cancelled) return;
      if (sessionRes.ok) setSession(sessionRes.data);
      if (captureRes.ok) {
        // Convert Capture[] → CaptureResult[] shape that the gallery expects.
        setHistoricCaptures(
          captureRes.data.map((c) => ({
            captureId:    c.id,
            filename:     c.originalFilename,
            sha256Hash:   c.sha256Hash,
            fileSizeBytes: c.fileSizeBytes,
            thumbnail:    '',   // will be lazy-loaded via getThumbnail
            capturedAt:   c.capturedAt,
            statusTag:    c.statusTag,
          }))
        );
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [sessionId, activeSession]);

  // §13: toolbar-initiated session end — mark session as ended in local state
  // so the gallery drops the Live pill and End Session button without a reload.
  useEffect(() => {
    if (!window.evidexAPI.events.onSessionEnded) return;
    const off = window.evidexAPI.events.onSessionEnded((endedSessionId) => {
      if (endedSessionId !== sessionId) return;
      setSession((prev) =>
        prev ? { ...prev, endedAt: new Date().toISOString() } : prev
      );
    });
    return off;
  }, [sessionId]);

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

  // SG-NEW-01: use live captures for active session, historic otherwise.
  const isActive = session !== null && session.endedAt === undefined
    && activeSession?.id === sessionId;
  const displayCaptures = isActive ? captures : historicCaptures;

  const counts = useMemo(() => {
    const derived = derivedCounts(displayCaptures);
    const captureCount = status?.captureCount ?? session?.captureCount ?? derived.captureCount;
    return {
      sessionId:    sessionId ?? '',
      captureCount,
      passCount:    derived.passCount,
      failCount:    derived.failCount,
      blockedCount: derived.blockedCount,
    };
  }, [status, session, displayCaptures, sessionId]);

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
    () => displayCaptures.find((c) => c.captureId === openCaptureId) ?? null,
    [displayCaptures, openCaptureId]
  );

  if (!projectId || !sessionId) return null;

  const detailVariants = reducedMotion ? fadeIn : pageForward;

  return (
    <div className="gallery-shell">
      {/* GA-03: flash scoped to gallery-main (position:relative), not fixed viewport */}
      <main className="gallery-main" style={{ position: 'relative' }}>
        {flashOn && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background: '#FFFFFF',
              opacity: 0.6,
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />
        )}
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
        ) : displayCaptures.length === 0 ? (
          <EmptyState />
        ) : (
          <ThumbnailGrid
            captures={displayCaptures}
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
              allCaptures={displayCaptures}
              onClose={() => setOpenCaptureId(null)}
              onNavigate={(id) => setOpenCaptureId(id)}
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

const TAG_CYCLE: StatusTag[] = ['pass', 'fail', 'blocked', 'skip', 'untagged'];

const TAG_COLOR: Record<StatusTag, string> = {
  pass:     'var(--color-status-pass)',
  fail:     'var(--color-status-fail)',
  blocked:  'var(--color-status-blocked)',
  skip:     'var(--color-status-skip)',
  untagged: 'var(--color-text-tertiary)',
};

function DetailPanel({
  capture,
  allCaptures,
  onClose,
  onNavigate,
}: {
  capture: CaptureResult;
  allCaptures: CaptureResult[];
  onClose: () => void;
  onNavigate: (id: string) => void;
}): JSX.Element {
  const updateCaptureTag = useSessionStore((s) => s.updateCaptureTag);
  const [saving, setSaving] = useState(false);
  const [additionalDetails, setAdditionalDetails] = useState<Array<{ title: string; desc: string }>>([]);
  const imgSrc = useThumbnailUrl(capture.thumbnail);

  const currentTag: StatusTag = capture.statusTag ?? 'untagged';
  const idx = allCaptures.findIndex((c) => c.captureId === capture.captureId);
  const prevCapture = idx > 0 ? allCaptures[idx - 1] : null;
  const nextCapture = idx < allCaptures.length - 1 ? allCaptures[idx + 1] : null;

  async function cycleTag(): Promise<void> {
    if (saving) return;
    const nextTag = TAG_CYCLE[(TAG_CYCLE.indexOf(currentTag) + 1) % TAG_CYCLE.length]!;
    setSaving(true);
    try { await updateCaptureTag(capture.captureId, nextTag); }
    catch { /* optimistic revert handled in store */ }
    finally { setSaving(false); }
  }

  // §17/18: additional details persisted as capture notes JSON
  useEffect(() => {
    try {
      if (capture.notes) {
        const parsed = JSON.parse(capture.notes);
        if (Array.isArray(parsed)) { setAdditionalDetails(parsed); return; }
      }
    } catch { /* notes is plain text, not JSON */ }
    setAdditionalDetails([]);
  }, [capture.captureId, capture.notes]);

  async function saveAdditionalDetails(next: typeof additionalDetails): Promise<void> {
    setAdditionalDetails(next);
    await window.evidexAPI.capture.updateTag(capture.captureId, currentTag);
    // Persist as JSON in notes via a notes update IPC (available in Phase 3).
    // For now: no-op persistence beyond local state.
  }

  return (
    <>
      {/* §17/18: card header — title + close */}
      <div className="detail-panel__header">
        <h2 className="detail-panel__title">
          Capture #{allCaptures.findIndex((c) => c.captureId === capture.captureId) + 1}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail panel"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'inline-flex', padding: 4, borderRadius: 'var(--radius-control)' }}
        >
          ×
        </button>
      </div>

      {/* §17/18: full-width thumbnail */}
      <div className="detail-panel__hero">
        {imgSrc && <img src={imgSrc} alt="" />}
      </div>

      <div className="detail-panel__body">
        {/* §17/18: 2-col metadata grid */}
        <dl className="detail-panel__meta">
          <dt style={{ gridColumn: '1 / -1', fontWeight: 600 }}>Filename</dt>
          <dd style={{ gridColumn: '1 / -1' }} className="normal">{capture.filename}</dd>
          <dt>Date</dt>
          <dd className="normal">{new Date(capture.capturedAt).toLocaleDateString()}</dd>
          <dt>Time</dt>
          <dd className="normal">{new Date(capture.capturedAt).toLocaleTimeString()}</dd>
          <dt>SHA-256</dt>
          <dd title={capture.sha256Hash}>…{capture.sha256Hash.slice(-12)}</dd>
          <dt>Size</dt>
          <dd className="normal">{(capture.fileSizeBytes / 1024).toFixed(1)} KB</dd>
        </dl>

        {/* §17/18: status pill — click cycles through statuses */}
        <div>
          <div className="detail-panel__section-label">Status</div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void cycleTag()}
            title="Click to change status"
            style={{
              display:      'inline-flex',
              alignItems:   'center',
              gap:          8,
              padding:      '6px 16px',
              borderRadius: 'var(--radius-pill)',
              border:       `2px solid ${TAG_COLOR[currentTag]}`,
              background:   'transparent',
              color:        TAG_COLOR[currentTag],
              fontWeight:   600,
              fontSize:     'var(--type-caption-size)',
              cursor:       'pointer',
              transition:   'all 0.14s ease',
            }}
            aria-label={`Status: ${currentTag}. Click to cycle.`}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: TAG_COLOR[currentTag], flexShrink: 0 }} />
            {currentTag.charAt(0).toUpperCase() + currentTag.slice(1)}
          </button>
        </div>

        {/* §17/18: additional details — key-value pairs */}
        <div>
          <div className="detail-panel__section-label">Additional details</div>
          {additionalDetails.map((d, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <input
                value={d.title}
                onChange={(e) => {
                  const next = [...additionalDetails];
                  next[i] = { ...next[i]!, title: e.target.value };
                  void saveAdditionalDetails(next);
                }}
                placeholder="Title"
                className="input"
                style={{ fontSize: 12, height: 28, padding: '0 8px' }}
              />
              <input
                value={d.desc}
                onChange={(e) => {
                  const next = [...additionalDetails];
                  next[i] = { ...next[i]!, desc: e.target.value };
                  void saveAdditionalDetails(next);
                }}
                placeholder="Description"
                className="input"
                style={{ fontSize: 12, height: 28, padding: '0 8px' }}
              />
              <button
                type="button"
                onClick={() => void saveAdditionalDetails(additionalDetails.filter((_, j) => j !== i))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: '0 4px', fontSize: 14 }}
                aria-label="Remove"
              >×</button>
            </div>
          ))}
          <button
            type="button"
            className="btn-link"
            style={{ fontSize: 'var(--type-caption-size)' }}
            onClick={() => void saveAdditionalDetails([...additionalDetails, { title: '', desc: '' }])}
          >
            + Add detail
          </button>
        </div>
      </div>

      {/* §17/18: footer — prev / annotate / next */}
      <div className="detail-panel__actions" style={{ justifyContent: 'space-between' }}>
        <button
          type="button"
          onClick={() => prevCapture && onNavigate(prevCapture.captureId)}
          disabled={!prevCapture}
          aria-label="Previous capture"
          style={{ background: 'none', border: '1px solid var(--color-stroke-default)', borderRadius: 'var(--radius-control)', cursor: prevCapture ? 'pointer' : 'default', opacity: prevCapture ? 1 : 0.4, padding: '4px 12px', color: 'var(--color-text-primary)', fontSize: 'var(--type-caption-size)' }}
        >
          ← Prev
        </button>
        <button
          type="button"
          className="btn-accent btn-base"
          onClick={() => { void window.evidexAPI.capture.openAnnotation(capture.captureId); }}
          style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 16px', height: 32, fontSize: 'var(--type-caption-size)' }}
        >
          <EditRegular fontSize={14} /> Annotate
        </button>
        <button
          type="button"
          onClick={() => nextCapture && onNavigate(nextCapture.captureId)}
          disabled={!nextCapture}
          aria-label="Next capture"
          style={{ background: 'none', border: '1px solid var(--color-stroke-default)', borderRadius: 'var(--radius-control)', cursor: nextCapture ? 'pointer' : 'default', opacity: nextCapture ? 1 : 0.4, padding: '4px 12px', color: 'var(--color-text-primary)', fontSize: 'var(--type-caption-size)' }}
        >
          Next →
        </button>
      </div>
    </>
  );
}
