/**
 * Fluent progress ring (Docs §13.4). Always inline with a label — never
 * a full-screen centred spinner. Three permitted sizes: 16 (in-button),
 * 20 (standard), 32 (blocking overlay inside the modal smoke layer).
 */

export type ProgressRingSize = 16 | 20 | 32;

export interface ProgressRingProps {
  size?: ProgressRingSize;
  label?: string;
  caption?: string;
}

export function ProgressRing({ size = 20, label, caption }: ProgressRingProps): JSX.Element {
  const radius = 8;
  const strokeWidth = size === 32 ? 1.5 : 2;
  const arcLength = size === 32 ? 30 : size === 20 ? 25 : 20;
  const circumference = 2 * Math.PI * radius; // ≈ 50.27

  return (
    <div
      role="status"
      aria-label={label ?? 'Loading'}
      aria-busy="true"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: size === 32 ? 'var(--space-3)' : 'var(--space-2)',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 20 20"
        style={{
          animation: 'fluent-ring-rotate 1.5s linear infinite',
          transformOrigin: 'center',
          flexShrink: 0,
        }}
      >
        <circle
          cx="10"
          cy="10"
          r={radius}
          fill="none"
          stroke="var(--color-stroke-default)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx="10"
          cy="10"
          r={radius}
          fill="none"
          stroke="var(--color-accent-default)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          style={{ animation: 'fluent-ring-arc 1s var(--easing-standard) infinite' }}
        />
      </svg>
      {(label || caption) && (
        <div>
          {label && (
            <div
              style={{
                fontSize:   size === 32 ? 'var(--type-body-size)' : 'var(--type-caption-size)',
                fontWeight: size === 32 ? 'var(--type-body-weight)' : undefined,
                color:      'var(--color-text-primary)',
              }}
            >
              {label}
            </div>
          )}
          {caption && (
            <div
              style={{
                fontSize:  'var(--type-caption-size)',
                color:     'var(--color-text-secondary)',
                marginTop: 2,
              }}
            >
              {caption}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
