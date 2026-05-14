import { Skeleton } from './Skeleton';

/**
 * Gallery loading state (Docs §13.2).
 *
 * GA-01 fix: skeletons now render inside `.gallery-grid` using the same
 * CSS Grid layout as the real thumbnail grid (auto-fill, minmax 220px).
 * Previously used flexWrap at 160px — caused a jarring layout jump when
 * real thumbnails loaded.
 *
 * Each skeleton tile mirrors the CaptureThumbnail structure:
 *   - 16:9 image placeholder (aspect-ratio: 16/9)
 *   - thin footer strip with a status-badge placeholder
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
      className="gallery-grid"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            opacity:       Math.max(0.3, 1 - i * 0.06),
            borderRadius:  'var(--radius-card)',
            overflow:      'hidden',
            border:        '1px solid var(--color-stroke-default)',
            background:    'var(--color-layer-1)',
          }}
        >
          {/* 16:9 image placeholder — height driven by aspectRatio via style */}
          <div
            aria-hidden="true"
            className="skeleton"
            style={{
              width:       '100%',
              aspectRatio: '16 / 9',
              display:     'block',
              borderRadius: 0,
            }}
          />
          {/* Footer strip */}
          <div
            style={{
              display:    'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding:    'var(--space-2) var(--space-3)',
              borderTop:  '1px solid var(--color-stroke-divider)',
            }}
          >
            <Skeleton width={52} height={20} borderRadius="var(--radius-pill)" />
            <Skeleton width={36} height={12} borderRadius="var(--radius-control)" />
          </div>
        </div>
      ))}
    </div>
  );
}
