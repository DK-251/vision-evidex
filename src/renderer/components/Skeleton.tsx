import { Skeleton as FluentSkeleton } from './ui/Skeleton';
import type { CSSProperties } from 'react';

/**
 * Backwards-compat re-export so D25 screens (Onboarding/Dashboard/
 * AppSettings) keep importing `./components/Skeleton` during FUI-2/3.
 * FUI-4 ports them to import from `./components/ui` directly.
 */

export function Skeleton({
  className = '',
  style,
}: {
  className?: string;
  style?: CSSProperties;
}): JSX.Element {
  return <FluentSkeleton className={className} style={style ?? {}} />;
}

export function BootSkeleton(): JSX.Element {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-layer-0)',
      padding: 'var(--space-6)',
    }}>
      <div style={{
        maxWidth: 480,
        width: '100%',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--space-8)',
        boxShadow: 'var(--shadow-card)',
        background: 'var(--color-layer-1)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}>
        <FluentSkeleton height={12} width="30%" />
        <FluentSkeleton height={24} width="75%" />
        <FluentSkeleton height={16} width="100%" />
        <FluentSkeleton height={16} width="85%" />
        <div style={{ paddingTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <FluentSkeleton height={40} width="100%" />
          <FluentSkeleton height={40} width="100%" />
        </div>
        <div style={{ paddingTop: 'var(--space-2)', display: 'flex', justifyContent: 'space-between' }}>
          <FluentSkeleton height={32} width={64} />
          <FluentSkeleton height={32} width={80} />
        </div>
      </div>
    </div>
  );
}
