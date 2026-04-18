/**
 * Fluent progress bar (Docs §13.3 + §13.5).
 *   - Omit `value` for indeterminate (sweeping accent fill).
 *   - Pass `value` 0–100 for determinate.
 *   - `status` colours the determinate fill: warning, danger, success.
 */

export type ProgressStatus = 'default' | 'warning' | 'danger' | 'success';

export interface ProgressBarProps {
  value?: number;
  label?: string;
  caption?: string;
  status?: ProgressStatus;
}

export function ProgressBar({
  value,
  label,
  caption,
  status = 'default',
}: ProgressBarProps): JSX.Element {
  const isIndeterminate = value === undefined;
  const pct = isIndeterminate ? undefined : Math.min(100, Math.max(0, value!));

  return (
    <div
      role="progressbar"
      aria-label={label ?? 'Loading'}
      {...(pct !== undefined ? { 'aria-valuenow': pct } : {})}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {(label || caption) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-1)',
          }}
        >
          {label && (
            <span style={{ fontSize: 'var(--type-body-size)', color: 'var(--color-text-secondary)' }}>
              {label}
            </span>
          )}
          {caption && (
            <span style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-tertiary)' }}>
              {caption}
            </span>
          )}
        </div>
      )}
      <div className="progress-bar-track">
        {isIndeterminate ? (
          <div className="progress-bar-indeterminate" />
        ) : (
          <div
            className={`progress-bar-determinate ${status === 'default' ? '' : status}`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}
