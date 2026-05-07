import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from 'react';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { AppSettingsPage } from './pages/AppSettingsPage';
import { SessionIntakePage } from './pages/SessionIntakePage';
import { SessionGalleryPage } from './pages/SessionGalleryPage';
import { ProjectListPage } from './pages/ProjectListPage';
import { CreateProjectPage } from './pages/CreateProjectPage';
import { useOnboardingStore } from './stores/onboarding-store';
import { useNavStore } from './stores/nav-store';
import { BootSkeleton } from './components/Skeleton';
import { ThemeProvider } from './providers/ThemeProvider';
import { Shell } from './components/shell';

export function App(): JSX.Element {
  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
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

  const onboarded = onboardedInSettings || completedInSession;
  const bootBanner = bootError ? (
    <div
      role="alert"
      style={{
        position: 'fixed',
        top: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        maxWidth: 560,
        background: 'var(--color-layer-1)',
        border: '1px solid var(--color-text-danger)',
        borderRadius: 'var(--radius-card)',
        padding: '6px 12px',
        fontSize: 'var(--type-caption-size)',
        color: 'var(--color-text-danger)',
        boxShadow: 'var(--shadow-layer-2)',
      }}
    >
      Boot warning: {bootError}
    </div>
  ) : null;

  if (!onboarded) {
    return (
      <>
        {bootBanner}
        <OnboardingPage />
      </>
    );
  }

  return (
    <>
      {bootBanner}
      <Shell>
        <ShellPageSwitch page={shellPage} />
      </Shell>
    </>
  );
}

function ShellPageSwitch({ page }: { page: ReturnType<typeof useNavStore.getState>['page'] }): JSX.Element {
  switch (page) {
    case 'settings':
      return <AppSettingsPage />;
    case 'session-intake':
      return <SessionIntakePage />;
    case 'session-gallery':
      return <SessionGalleryPage />;
    case 'dashboard':
      return <DashboardPage />;
    case 'create-project':
      return <CreateProjectPage />;
    case 'project-list':
    default:
      // Wk 8 (AQ5) — post-onboarding home is the project list.
      return <ProjectListPage />;
  }
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
      <div style={{ minHeight: '100vh', background: 'var(--color-layer-0)', padding: 'var(--space-6)' }}>
        <div style={{
          maxWidth: 640,
          margin: '0 auto',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--color-text-danger)',
          padding: 'var(--space-4)',
          background: 'var(--color-layer-1)',
        }}>
          <h1 style={{ fontSize: 'var(--type-body-large-size)', fontWeight: 600, color: 'var(--color-text-danger)', margin: 0 }}>
            Vision-EviDex failed to render
          </h1>
          <p style={{ marginTop: 8, fontSize: 'var(--type-body-size)', color: 'var(--color-text-primary)' }}>
            {this.state.error.message}
          </p>
          <pre style={{ marginTop: 12, fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {this.state.error.stack}
          </pre>
        </div>
      </div>
    );
  }
}
