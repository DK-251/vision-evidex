import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

/**
 * Fluent button. One Accent per dialog/page max; everything else is
 * Standard, Subtle, or Outline (destructive). Use a leading icon via
 * `startIcon`, a trailing icon via `endIcon`. For in-card/compact
 * contexts pass `size="compact"` (28px height).
 */

export type ButtonVariant = 'accent' | 'standard' | 'subtle' | 'outline';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'normal' | 'compact';
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  accent:   'btn-accent',
  standard: 'btn-standard',
  subtle:   'btn-subtle',
  outline:  'btn-outline',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'standard', size = 'normal', startIcon, endIcon, className, children, type, ...rest },
  ref
) {
  const classes = [
    'btn-base',
    VARIANT_CLASS[variant],
    size === 'compact' ? 'btn-compact' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button ref={ref} type={type ?? 'button'} className={classes} {...rest}>
      {startIcon}
      {children}
      {endIcon}
    </button>
  );
});
