import { useEffect, useState, type MouseEvent } from 'react';
import { CheckmarkFilled } from '@fluentui/react-icons';
import type { CaptureResult } from '@shared/types/entities';
import { StatusBadge, type StatusTagKind } from './StatusBadge';

/**
 * Capture thumbnail (Docs §5.7) — Fluent card with hover lift, status
 * badge in the footer, sequence number top-left, accent checkmark
 * top-right on multi-select. All styling lives in the `.capture-thumbnail`
 * family in components.css so dark/high-contrast themes inherit from
 * the token system automatically.
 *
 * Image source: `CaptureResult.thumbnail` is a `data:image/jpeg;base64,…`
 * URL produced by `CaptureService`. Buffer support is defensive — if a
 * future capture path returns raw bytes we fall back to `createObjectURL`
 * and revoke on unmount.
 */

export interface CaptureThumbnailProps {
  capture:        CaptureResult;
  isSelected?:    boolean;
  sequenceNum?:   number;
  onClick?:       (captureId: string) => void;
  onShiftClick?:  (captureId: string) => void;
}

function formatClock(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
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
    if (typeof raw === 'string') {
      setImgSrc(raw);
      return;
    }
    if (raw instanceof Uint8Array) {
      const blob = new Blob([raw as unknown as BlobPart], { type: 'image/jpeg' });
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
      aria-label={`Capture ${sequenceNum ?? capture.captureId} — ${capture.statusTag}`}
    >
      <img className="capture-thumbnail-img" src={imgSrc} alt="" />

      {sequenceNum !== undefined && (
        <span className="capture-thumbnail__seq-badge" aria-hidden="true">
          #{sequenceNum}
        </span>
      )}

      {isSelected && (
        <span className="capture-thumbnail__check-badge" aria-hidden="true">
          <CheckmarkFilled fontSize={14} />
        </span>
      )}

      <span className="capture-thumbnail-footer">
        <StatusBadge tag={capture.statusTag as StatusTagKind} />
        <span className="capture-thumbnail__time">
          {formatClock(capture.capturedAt)}
        </span>
      </span>
    </button>
  );
}
