import { ShieldCheckmarkFilled } from '@fluentui/react-icons';

/**
 * Fluent title bar (Docs §8.1). Rendered by the renderer as a 32px
 * draggable strip under the OS-level `titleBarOverlay`. The right
 * 140px of the strip is reserved for Windows caption buttons — we
 * hand that region back to the OS via `padding-right` in CSS.
 *
 * The OS overlay is applied by the main process via `titleBarStyle:
 * 'hidden'` + `titleBarOverlay` — see `src/main/window-manager.ts`.
 */

export interface TitleBarProps {
  title?: string;
}

export function TitleBar({ title = 'Vision-EviDex' }: TitleBarProps): JSX.Element {
  return (
    <div className="title-bar" role="presentation">
      <span className="title-bar-icon" aria-hidden="true">
        <ShieldCheckmarkFilled />
      </span>
      <span className="title-bar-title">{title}</span>
    </div>
  );
}
