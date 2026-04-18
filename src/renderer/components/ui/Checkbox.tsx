import { forwardRef, type InputHTMLAttributes } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className, ...rest },
  ref
) {
  return (
    <label className={`checkbox ${className ?? ''}`.trim()} aria-label={label}>
      <input ref={ref} type="checkbox" {...rest} />
    </label>
  );
});
