import { useEffect, useState } from 'react';
import { AppMark } from '../brand/BrandIcons';

/**
 * Fully custom Fluent title bar (Docs §8.1). Rendered by the renderer
 * over a `frame: false` Electron window, so every pixel — caption
 * buttons included — is React-owned. CSS `-webkit-app-region: drag`
 * gives the strip native window-drag behaviour; the caption buttons
 * opt out via `no-drag`. Double-clicking the draggable area toggles
 * maximize (handled by the OS when `app-region: drag` is set).
 *
 * Window state (minimize/maximize/close) is dispatched through the
 * preload bridge `window.evidexAPI.windowControls` which proxies to
 * IPC handlers in `src/main/ipc-router.ts`. No `remote` module, no
 * direct renderer → `BrowserWindow` coupling.
 */

export interface TitleBarProps {
  title?: string;
}

export function TitleBar({ title = 'Vision-EviDex' }: TitleBarProps): JSX.Element {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await window.evidexAPI.windowControls.isMaximized();
      if (!cancelled && result.ok) setMaximized(result.data);
    })();
    const off = window.evidexAPI.events.onMaximizedChange((next) => {
      setMaximized(next);
    });
    return () => {
      cancelled = true;
      off?.();
    };
  }, []);

  const onMinimize = (): void => {
    void window.evidexAPI.windowControls.minimize();
  };
  const onMaximizeToggle = (): void => {
    void window.evidexAPI.windowControls.maximizeToggle();
  };
  const onClose = (): void => {
    void window.evidexAPI.windowControls.close();
  };

  return (
    <div className="title-bar" role="presentation">
      <span className="title-bar-icon" aria-hidden="true">
        <AppMark fontSize={16} />
      </span>
      <span className="title-bar-title">{title}</span>
      <div className="caption-buttons" role="group" aria-label="Window controls">
        <CaptionButton
          label="Minimize"
          onClick={onMinimize}
          icon={<MinimizeGlyph />}
        />
        <CaptionButton
          label={maximized ? 'Restore' : 'Maximize'}
          onClick={onMaximizeToggle}
          icon={maximized ? <RestoreGlyph /> : <MaximizeGlyph />}
        />
        <CaptionButton
          label="Close"
          onClick={onClose}
          icon={<CloseGlyph />}
          variant="close"
        />
      </div>
    </div>
  );
}

function CaptionButton({
  label,
  icon,
  onClick,
  variant,
}: {
  label: string;
  icon: JSX.Element;
  onClick: () => void;
  variant?: 'close';
}): JSX.Element {
  return (
    <button
      type="button"
      className={`caption-button${variant === 'close' ? ' caption-button--close' : ''}`}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

/* Caption glyphs — 10×10 inline SVG so stroke weight and alignment
   match the Windows 11 Fluent caption set (Segoe Fluent Icons E921–E923,
   E8BB) without relying on a webfont. */

function MinimizeGlyph(): JSX.Element {
  return (
    <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden="true" focusable="false">
      <path d="M1 5 H9" stroke="currentColor" strokeWidth={1} strokeLinecap="square" fill="none" />
    </svg>
  );
}

function MaximizeGlyph(): JSX.Element {
  return (
    <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden="true" focusable="false">
      <rect
        x={0.5}
        y={0.5}
        width={9}
        height={9}
        stroke="currentColor"
        strokeWidth={1}
        fill="none"
      />
    </svg>
  );
}

function RestoreGlyph(): JSX.Element {
  return (
    <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden="true" focusable="false">
      <rect
        x={0.5}
        y={2.5}
        width={7}
        height={7}
        stroke="currentColor"
        strokeWidth={1}
        fill="none"
      />
      <path
        d="M2.5 2.5 V0.5 H9.5 V7.5 H7.5"
        stroke="currentColor"
        strokeWidth={1}
        fill="none"
      />
    </svg>
  );
}

function CloseGlyph(): JSX.Element {
  return (
    <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden="true" focusable="false">
      <path
        d="M1 1 L9 9 M9 1 L1 9"
        stroke="currentColor"
        strokeWidth={1}
        strokeLinecap="square"
        fill="none"
      />
    </svg>
  );
}
