import { forwardRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { toastEnter } from '../animations';

export type ToastSeverity = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  severity?: ToastSeverity;
  title: string;
  body?: ReactNode;
  icon?: ReactNode;
  onDismiss?: () => void;
}

export const Toast = forwardRef<HTMLDivElement, ToastProps>(function Toast(
  { severity = 'info', title, body, icon, onDismiss },
  ref
) {
  return (
    <motion.div
      ref={ref}
      className={`toast ${severity}`}
      variants={toastEnter}
      initial="initial"
      animate="animate"
      exit="exit"
      role={severity === 'error' ? 'alert' : 'status'}
      aria-live={severity === 'error' ? 'assertive' : 'polite'}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <div style={{ flex: 1 }}>
        <div className="toast-title">{title}</div>
        {body && <div className="toast-body">{body}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            background: 'transparent',
            border: 0,
            padding: 4,
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
          }}
        >
          ×
        </button>
      )}
    </motion.div>
  );
});
