import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { dialogEnter, fadeIn } from '../animations';

/**
 * Fluent modal — smoke backdrop + scale/fade-in dialog. `open` drives
 * AnimatePresence; the dialog unmounts after the exit transition so
 * focus is restored cleanly. Escape closes when `onClose` is provided;
 * click-outside does not close (use a Cancel button in modal-actions —
 * destructive-or-lose-work modals should never close on outside click).
 *
 * Keyboard contract:
 *   • Escape — closes via `onClose`; the keydown listener is scoped to
 *     the dialog (capture phase) and stops propagation so a nested
 *     confirm modal closes only itself, not the parent underneath.
 *   • Tab / Shift+Tab — focus is trapped inside the dialog by cycling
 *     between the first and last tabbable descendants.
 */

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled])' +
  ':not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  titleId?: string;
  ariaLabelledBy?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, titleId, ariaLabelledBy, children }: ModalProps): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // Remember which element had focus before the modal opened, and
  // restore it when the dialog closes. Pairs with the auto-focus
  // effect below so screen-reader focus position stays sensible.
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement;
    }
    return () => {
      const prev = previousFocusRef.current;
      if (prev instanceof HTMLElement && document.body.contains(prev)) {
        prev.focus();
      }
    };
  }, [open]);

  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  function getFocusable(): HTMLElement[] {
    const root = dialogRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      .filter((el) => el.offsetParent !== null || el.getClientRects().length > 0);
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>): void {
    if (e.key === 'Escape') {
      if (onClose) {
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = getFocusable();
    if (focusable.length === 0) {
      e.preventDefault();
      dialogRef.current?.focus();
      return;
    }
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === dialogRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          variants={fadeIn}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <motion.div
            ref={dialogRef}
            className="modal elevation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={ariaLabelledBy ?? titleId}
            tabIndex={-1}
            onKeyDown={onKeyDown}
            variants={dialogEnter}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ModalTitle({ id, children }: { id?: string; children: ReactNode }): JSX.Element {
  return (
    <h2 id={id} className="modal-title">
      {children}
    </h2>
  );
}

export function ModalBody({ children }: { children: ReactNode }): JSX.Element {
  return <div className="modal-body">{children}</div>;
}

export function ModalActions({ children }: { children: ReactNode }): JSX.Element {
  return <div className="modal-actions">{children}</div>;
}
