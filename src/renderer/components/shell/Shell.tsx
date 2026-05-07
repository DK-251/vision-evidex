import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';
import { useWindowTier } from '../../hooks/useWindowTier';

/**
 * Application shell — composes the 32px title bar strip with the
 * Sidebar nav rail and a scrollable content area (Docs §4.5). Every
 * post-onboarding screen renders inside `children`; the Onboarding
 * wizard bypasses the shell per doc §15 S-02 ("Full-window, no
 * sidebar") so it owns the entire viewport.
 */

export interface ShellProps {
  children: ReactNode;
  title?: string;
}

export function Shell({ children, title }: ShellProps): JSX.Element {
  useWindowTier();
  return (
    <div className="shell-root material-mica">
      <TitleBar {...(title ? { title } : {})} />
      <div className="shell-main">
        <Sidebar />
        <main className="shell-content" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}
