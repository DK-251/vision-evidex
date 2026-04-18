import { OnboardingPage } from './pages/OnboardingPage';

/**
 * Main window root.
 *
 * Phase 1 Wk4 D20: shows the onboarding wizard unconditionally so the
 * skeleton is immediately exercisable on Asus's `npm run dev`. The real
 * gate — "render OnboardingPage only when `settings.onboardingComplete`
 * is false, otherwise route to DashboardPage" — lands in Wk5 D23 when
 * the `settings:*` IPC channels arrive.
 */
export function App(): JSX.Element {
  return <OnboardingPage />;
}
