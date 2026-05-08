import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence } from 'framer-motion';
import { Toast, type ToastSeverity } from '../components/ui/Toast';

/**
 * ToastProvider — global toast surface for the renderer.
 *
 * Usage:
 *   const { showToast } = useToast();
 *   showToast('error', 'Session end failed', err.message);
 *
 * Toasts auto-dismiss after 4 seconds. The user can also dismiss
 * manually via the × button. Rendered in a fixed portal at
 * bottom-right so they never overlap modal content.
 */

interface ToastItem {
  id: string;
  severity: ToastSeverity;
  title: string;
  body?: string;
}

interface ToastContextValue {
  showToast: (severity: ToastSeverity, title: string, body?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const showToast = useCallback(
    (severity: ToastSeverity, title: string, body?: string) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((t) => [...t, { id, severity, title, body }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        style={{
          position:      'fixed',
          bottom:        'var(--space-4)',
          right:         'var(--space-4)',
          display:       'flex',
          flexDirection: 'column',
          gap:           'var(--space-2)',
          zIndex:        200,
          pointerEvents: 'none',
          maxWidth:      400,
        }}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <div key={t.id} style={{ pointerEvents: 'auto' }}>
              <Toast
                severity={t.severity}
                title={t.title}
                body={t.body}
                onDismiss={() => dismiss(t.id)}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
