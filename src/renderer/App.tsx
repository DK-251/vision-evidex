import { useEffect, useState } from 'react';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { useOnboardingStore } from './stores/onboarding-store';

/**
 * Main window root.
 *
 * Phase 1 Wk5 D23: first real routing gate. On mount we ask the main
 * process for the current settings. If `onboardingComplete === true`
 * we render the Dashboard; otherwise the onboarding wizard. The
 * wizard's own `completed` flag short-circuits to the Dashboard when
 * the user clicks Finish, so there's no reload required.
 *
 * Design notes:
 *   - Fails closed: any IPC error keeps the wizard showing. Better to
 *     force a fresh onboarding than to render Dashboard against a
 *     half-valid settings file.
 *   - No React Router yet — we have exactly two destinations. Adding
 *     routing infrastructure is Phase 2 work when deeper navigation
 *     (sessions, captures, reports) lands.
 */
export function App(): JSX.Element {
  const [onboardedInSettings, setOnboardedInSettings] = useState<boolean | null>(null);
  const completedInSession = useOnboardingStore((s) => s.completed);

  useEffect(() => {
    let cancelled = false;
    window.evidexAPI.settings.get().then((result) => {
      if (cancelled) return;
      setOnboardedInSettings(result.ok ? result.data.onboardingComplete : false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (onboardedInSettings === null) {
    // Tiny placeholder — real splash UX is out of scope.
    return <div className="min-h-screen bg-surface-primary" />;
  }
  if (onboardedInSettings || completedInSession) {
    return <DashboardPage />;
  }
  return <OnboardingPage />;
}
