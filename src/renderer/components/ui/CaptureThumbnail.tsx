import { useEffect, useState, type MouseEvent } from 'react';
import { CheckmarkFilled } from '@fluentui/react-icons';
import type { CaptureResult, StatusTag } from '@shared/types/entities';
import { StatusBadge, type StatusTagKind } from './StatusBadge';

/**
 * Capture thumbnail (Docs §5.7). 160 px tile rendered in the gallery
 * grid. Single-click selects/opens; Shift+click adds to multi-select.
 *
 * Image source: `CaptureResult.thumbnail` is already a `data:image/jpeg;
 * base64,...` URL produced by `CaptureService` (capture.service.ts:156).
 * If a future capture path returns a raw Buffer instead, we fall back
 * to `URL.createObjectURL()` and revoke on unmount.
 */

export interface CaptureThumbnailProps {
  capture:        CaptureResult;
  /** Status tag carried alongside the result. Defaults to 'untagged'. */
  statusTag?:     StatusTag;
  isSelected?:    boolean;
  /** Display sequence number — pulled from the DB `Capture` row, not on `CaptureResult`. */
  sequenceNum?:   number;
  onClick?:       (captureId: string) => void;
  onShiftClick?:  (captureId: string) => void;
}

export function CaptureThumbnail({
  capture,
  statusTag = 'untagged',
  isSelected = false,
  sequenceNum,
  onClick,
  onShiftClick,
}: CaptureThumbnailProps): JSX.Element {
  const [imgSrc, setImgSrc] = useState<string>('');

  useEffect(() => {
    // CaptureResult.thumbnail is a base64 data URL today. Buffer support is
    // defensive — we never want a future tweak in CaptureService to break
    // the gallery silently.
    const raw: unknown = capture.thumbnail;
    if (typeof raw === 'string') {
      setImgSrc(raw);
      return;
    }
    if (raw instanceof Uint8Array) {
      const blob = new Blob([raw], { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      setImgSrc(url);
      return () => URL.revokeObjectURL(url);
    }
    setImgSrc('');
    return;
  }, [capture.thumbnail]);

  function handleClick(ev: MouseEvent<HTMLButtonElement>): void {
    if (ev.shiftKey && onShiftClick) {
      onShiftClick(capture.captureId);
      return;
    }
    onClick?.(capture.captureId);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`capture-thumbnail ${isSelected ? 'selected' : ''}`.trim()}
      aria-pressed={isSelected}
      aria-label={`Capture ${sequenceNum ?? capture.captureId} — ${statusTag}`}
      style={{ position: 'relative', padding: 0 }}
    >
      <img className="capture-thumbnail-img" src={imgSrc} alt="" />

      {sequenceNum !== undefined && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            padding: '2px 6px',
            borderRadius: 'var(--radius-pill)',
            background: 'rgba(0,0,0,0.5)',
            color: '#FFFFFF',
            fontSize: 'var(--type-caption-size)',
            lineHeight: 1,
          }}
        >
          #{sequenceNum}
        </span>
      )}

      {isSelected && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'rgba(0,120,212,0.85)',
            color: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CheckmarkFilled fontSize={16} />
        </span>
      )}

      <span className="capture-thumbnail-footer">
        <StatusBadge tag={statusTag as StatusTagKind} />
      </span>
    </button>
  );
}
