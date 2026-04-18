import type { CSSProperties } from 'react';

/**
 * Fluent skeleton (Docs §13.2). Left-to-right shimmer sweep at 1.5s —
 * NOT the opacity pulse used pre-Fluent. `fluent-shimmer` keyframes
 * live in loading.css; reduced-motion freezes it to a static block.
 */

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius,
  className,
  style,
}: SkeletonProps): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={`skeleton ${className ?? ''}`.trim()}
      style={{
        width,
        height,
        borderRadius: borderRadius ?? 'var(--radius-control)',
        ...style,
      }}
    />
  );
}
