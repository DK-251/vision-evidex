import type { CSSProperties } from 'react';

/**
 * Skeleton — animated placeholder block for async loading states.
 *
 * Uses Tailwind's built-in `animate-pulse` on a surface-secondary block.
 * Screen-readers see `aria-hidden` so the skeleton does not clutter
 * assistive output — callers should render a polite live region if
 * they need loading announcements.
 */
export function Skeleton({
  className = '',
  style,
}: {
  className?: string;
  style?: CSSProperties;
}): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-surface-secondary rounded-md ${className}`}
      {...(style ? { style } : {})}
    />
  );
}

/**
 * BootSkeleton — full-viewport placeholder shown while the main window
 * waits for `settings:get` to return. Mirrors the onboarding card
 * silhouette so the shift to the real wizard feels like content
 * arriving rather than a layout jump.
 */
export function BootSkeleton(): JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-primary p-6">
      <div
        className="max-w-lg w-full rounded-lg p-8 space-y-4"
        style={{ boxShadow: 'var(--shadow-neumorphic-out)' }}
      >
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="pt-4 space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="pt-2 flex justify-between">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}
