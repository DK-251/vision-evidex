import { forwardRef, type InputHTMLAttributes } from 'react';

/**
 * Fluent toggle switch. Checked state fills the track with the accent
 * colour; the thumb turns white and grows ~14px wide (stretches to
 * 16px while pressed) — the characteristic Fluent micro-interaction.
 */

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(function Toggle(
  { label, className, ...rest },
  ref
) {
  return (
    <label className={`toggle-track ${className ?? ''}`.trim()} aria-label={label}>
      <input ref={ref} type="checkbox" role="switch" {...rest} />
      <span className="toggle-thumb" />
    </label>
  );
});
