import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from 'react';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { AppSettingsPage } from './pages/AppSettingsPage';
import { useOnboardingStore } from './stores/onboarding-store';
import { useNavStore } from './stores/nav-store';
import { BootSkeleton } from './components/Skeleton';

/**
 * Main window root.
 *
 * Routing gate: on mount we ask the main process for current settings.
 * If `onboardingComplete === true` → Dashboard (or AppSettings via
 * nav-store). Otherwise → OnboardingPage wizard. Fails open to the
 * wizard: any IPC error or preload-bridge absence routes to onboarding
 * rather than hanging forever on a blank screen.
 *
 * Includes a local error boundary so a render crash shows the error
 * rather than a white screen. The boundary is intentional — we want
 * the user (and our dev tools) to see the stack trace the moment
 * something throws.
 */
export function App(): JSX.Element {
  return (
    <AppErrorBoundary>
      <AppShell />
    </AppErrorBoundary>
  );
}

function AppShell(): JSX.Element {
  const [onboardedInSettings, setOnboardedInSettings] = useState<boolean | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const completedInSession = useOnboardingStore((s) => s.completed);
  const shellPage = useNavStore((s) => s.page);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        if (!window.evidexAPI?.settings?.get) {
          throw new Error('preload bridge missing — window.evidexAPI.settings is undefined');
        }
        const result = await window.evidexAPI.settings.get();
        if (cancelled) return;
        setOnboardedInSettings(result.ok ? result.data.onboardingComplete : false);
      } catch (err) {
        if (cancelled) return;
        setBootError(err instanceof Error ? err.message : String(err));
        // Fail open: show onboarding so the app is usable.
        setOnboardedInSettings(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (onboardedInSettings === null) {
    return <BootSkeleton />;
  }

  return (
    <>
      {bootError && (
        <div
          role="alert"
          className="fixed top-2 left-1/2 -translate-x-1/2 z-50 max-w-xl text-xs text-accent-error bg-surface-primary border border-accent-error px-3 py-1.5 rounded-md"
        >
          Boot warning: {bootError}
        </div>
      )}
      {onboardedInSettings || completedInSession ? (
        shellPage === 'settings' ? <AppSettingsPage /> : <DashboardPage />
      ) : (
        <OnboardingPage />
      )}
    </>
  );
}

interface BoundaryState {
  error: Error | null;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }
  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[AppErrorBoundary]', error, info);
  }
  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen bg-surface-primary p-6">
        <div className="max-w-2xl mx-auto rounded-md border border-accent-error p-4">
          <h1 className="text-lg font-semibold text-accent-error">Vision-EviDex failed to render</h1>
          <p className="mt-2 text-sm text-text-primary">
            {this.state.error.message}
          </p>
          <pre className="mt-3 text-xs text-text-secondary overflow-auto whitespace-pre-wrap">
            {this.state.error.stack}
          </pre>
        </div>
      </div>
    );
  }
}
