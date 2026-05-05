import { Skeleton } from './Skeleton';

/**
 * Gallery loading state (Docs §13.2). Eight 160×90 placeholder tiles
 * with progressively-fading opacity, plus a status-badge placeholder
 * underneath each. Visible until the first capture row resolves —
 * subsequent re-renders use the real `<CaptureThumbnail />` grid.
 */

export interface GallerySkeletonProps {
  count?: number;
}

export function GallerySkeleton({ count = 8 }: GallerySkeletonProps): JSX.Element {
  return (
    <div
      role="status"
      aria-label="Loading session gallery"
      aria-busy="true"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-2)',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ opacity: Math.max(0.3, 1 - i * 0.06) }}>
          <Skeleton width={160} height={90} borderRadius="var(--radius-card)" />
          <Skeleton
            width={48}
            height={18}
            borderRadius="var(--radius-pill)"
            style={{ marginTop: 6 }}
          />
        </div>
      ))}
    </div>
  );
}
