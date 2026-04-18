import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { dialogEnter, fadeIn } from '../animations';

/**
 * Fluent modal — smoke backdrop + scale/fade-in dialog. `open` drives
 * AnimatePresence; the dialog unmounts after the exit transition so
 * focus is restored cleanly. Escape closes when `onClose` is provided;
 * click-outside does not close (use a Cancel button in modal-actions —
 * destructive-or-lose-work modals should never close on outside click).
 */

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  titleId?: string;
  ariaLabelledBy?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, titleId, ariaLabelledBy, children }: ModalProps): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

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
