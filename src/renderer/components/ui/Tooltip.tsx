import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Fluent-styled Tooltip — replaces the browser `title=` attribute across
 * the design system. Wraps a single focusable child in an inline `<span>`,
 * listens for mouse/focus events on the bubble, and renders a portalled
 * popover with a short open-delay (Fluent default is 200 ms).
 *
 * The tooltip is purely informational — it never traps focus, never has
 * its own focusable controls, and respects `prefers-reduced-motion`
 * through framer-motion's transition.
 *
 * Position is computed once on open via `getBoundingClientRect()` and
 * recomputed on resize/scroll (which also auto-hides to avoid stale
 * coordinates). No auto-flip — pick a sensible `placement` per callsite.
 */

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  content: ReactNode;
  /** Default 'top' — most common for icon buttons. */
  placement?: TooltipPlacement;
  /** Hover open delay; 0 = instant. */
  delayMs?: number;
  /** Suppress entirely (useful for conditional render). */
  disabled?: boolean;
  /** Single focusable element (button, anchor, etc.). */
  children: ReactElement;
}

interface Coords { top: number; left: number; }

const GAP_PX = 8;

function computeCoords(rect: DOMRect, placement: TooltipPlacement): Coords {
  switch (placement) {
    case 'bottom':
      return { top: rect.bottom + GAP_PX, left: rect.left + rect.width / 2 };
    case 'left':
      return { top: rect.top + rect.height / 2, left: rect.left - GAP_PX };
    case 'right':
      return { top: rect.top + rect.height / 2, left: rect.right + GAP_PX };
    case 'top':
    default:
      return { top: rect.top - GAP_PX, left: rect.left + rect.width / 2 };
  }
}

export function Tooltip({
  content,
  placement = 'top',
  delayMs   = 200,
  disabled,
  children,
}: TooltipProps): JSX.Element {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const timerRef  = useRef<number | null>(null);
  const [open, setOpen]     = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);

  const clearTimer = (): void => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const show = useCallback((): void => {
    if (disabled || content === null || content === undefined || content === '') return;
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      const el = anchorRef.current;
      // The anchor span uses `display: contents` so it has no layout
      // box of its own — measure the wrapped element instead. Falls
      // back to the span if no element child is present (text only).
      const measurable = el?.firstElementChild ?? el;
      if (!measurable) return;
      setCoords(computeCoords(measurable.getBoundingClientRect(), placement));
      setOpen(true);
    }, delayMs);
  }, [content, delayMs, disabled, placement]);

  const hide = useCallback((): void => {
    clearTimer();
    setOpen(false);
  }, []);

  // Auto-hide on scroll/resize — stale coords would mis-place the popover.
  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [open, hide]);

  // Clear any pending timeout on unmount so a hidden component doesn't
  // pop a stray tooltip on the next render frame.
  useEffect(() => () => clearTimer(), []);

  return (
    <>
      <span
        ref={anchorRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="tooltip-anchor"
      >
        {children}
      </span>
      {coords !== null && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              role="tooltip"
              className={`tooltip tooltip-${placement}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.12, ease: [0.10, 0.90, 0.20, 1] }}
              style={{
                position:      'fixed',
                top:           coords.top,
                left:          coords.left,
                zIndex:        9999,
                pointerEvents: 'none',
              }}
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
