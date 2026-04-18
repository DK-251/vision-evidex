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
    <div className="min-h-screen flex items-center justify-center bg-surface-primary p-6">
      <div
        className="max-w-lg w-full rounded-lg p-8 space-y-4"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <FluentSkeleton height={12} width="30%" />
        <FluentSkeleton height={24} width="75%" />
        <FluentSkeleton height={16} width="100%" />
        <FluentSkeleton height={16} width="85%" />
        <div className="pt-4 space-y-2">
          <FluentSkeleton height={40} width="100%" />
          <FluentSkeleton height={40} width="100%" />
        </div>
        <div className="pt-2 flex justify-between">
          <FluentSkeleton height={32} width={64} />
          <FluentSkeleton height={32} width={80} />
        </div>
      </div>
    </div>
  );
}
