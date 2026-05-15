import { useEffect, useState, type MouseEvent } from 'react';
import { DeleteRegular } from '@fluentui/react-icons';
import type { CaptureResult } from '@shared/types/entities';
import { StatusBadge, type StatusTagKind } from './StatusBadge';
import { Tooltip } from './Tooltip';

/**
 * §16 — Capture thumbnail card redesign.
 *
 * Structure:
 *   Header: #N pill (left) | KB pill (right) — not clickable
 *   Body:   screenshot image — clicking opens detail panel
 *   Footer: status badge | time | disabled delete icon — footer not clickable
 *
 * Delete is disabled with "Delete coming in Phase 3" tooltip (decision 2026-05-15).
 */

export interface CaptureThumbnailProps {
  capture:       CaptureResult;
  isSelected?:   boolean;
  sequenceNum?:  number;
  onClick?:      (captureId: string) => void;
  onShiftClick?: (captureId: string) => void;
}

function formatClock(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatKB(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export function CaptureThumbnail({
  capture,
  isSelected = false,
  sequenceNum,
  onClick,
  onShiftClick,
}: CaptureThumbnailProps): JSX.Element {
  const [imgSrc, setImgSrc] = useState<string>('');

  useEffect(() => {
    const raw: unknown = capture.thumbnail;
    if (typeof raw === 'string') { setImgSrc(raw); return; }
    if (raw instanceof Uint8Array) {
      const blob = new Blob([raw as unknown as BlobPart], { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      setImgSrc(url);
      return () => URL.revokeObjectURL(url);
    }
    setImgSrc('');
    return;
  }, [capture.thumbnail]);

  function handleBodyClick(ev: MouseEvent<HTMLButtonElement>): void {
    if (ev.shiftKey && onShiftClick) { onShiftClick(capture.captureId); return; }
    onClick?.(capture.captureId);
  }

  return (
    <div
      className={`capture-thumbnail ${isSelected ? 'selected' : ''}`.trim()}
      style={{ cursor: 'default', padding: 0 }}
    >
      {/* ── Body: screenshot — clickable, sequence badge overlaid ── */}
      <button
        type="button"
        onClick={handleBodyClick}
        aria-pressed={isSelected}
        aria-label={`Capture ${sequenceNum ?? capture.captureId} — ${capture.statusTag}`}
        style={{
          display:    'block',
          width:      '100%',
          border:     'none',
          padding:    0,
          background: 'none',
          cursor:     'pointer',
          lineHeight: 0,
          position:   'relative',
        }}
      >
        <img
          className="capture-thumbnail-img"
          src={imgSrc}
          alt=""
          style={{ display: 'block', width: '100%' }}
        />
        {/* Sequence number badge — overlaid glass pill */}
        {sequenceNum !== undefined && (
          <span style={{
            position:       'absolute',
            top:            6,
            left:           6,
            padding:        '2px 8px',
            borderRadius:   'var(--radius-pill)',
            background:     'rgba(0,0,0,0.52)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            color:          '#FFFFFF',
            fontFamily:     'var(--font-mono)',
            fontSize:       10,
            fontWeight:     600,
            letterSpacing:  '0.04em',
            lineHeight:     '16px',
            pointerEvents:  'none',
          }}>
            #{sequenceNum}
          </span>
        )}
        {/* File size badge — top right */}
        <span style={{
          position:       'absolute',
          top:            6,
          right:          6,
          padding:        '2px 7px',
          borderRadius:   'var(--radius-pill)',
          background:     'rgba(0,0,0,0.38)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          color:          'rgba(255,255,255,0.85)',
          fontFamily:     'var(--font-mono)',
          fontSize:       10,
          lineHeight:     '16px',
          pointerEvents:  'none',
        }}>
          {formatKB(capture.fileSizeBytes)}
        </span>
      </button>

      {/* ── Footer: status + time + delete (disabled) ── */}
      <div
        className="capture-thumbnail-footer"
        style={{
          pointerEvents:  'none',
          background:     'var(--color-fill-subtle)',
        }}
      >
        <StatusBadge tag={capture.statusTag as StatusTagKind} />
        <span className="capture-thumbnail__time">
          {formatClock(capture.capturedAt)}
        </span>
        {/* §16: disabled delete icon, Phase 3 tooltip */}
        <Tooltip content="Delete coming in Phase 3" placement="top">
          <button
            type="button"
            disabled
            aria-label="Delete capture (coming in Phase 3)"
            style={{
              background:   'none',
              border:       'none',
              padding:      '2px',
              cursor:       'not-allowed',
              color:        'var(--color-text-disabled)',
              display:      'inline-flex',
              alignItems:   'center',
              pointerEvents: 'auto',
              opacity:      0.4,
            }}
          >
            <DeleteRegular fontSize={14} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
