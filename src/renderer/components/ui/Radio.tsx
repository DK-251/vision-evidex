import { forwardRef, type InputHTMLAttributes } from 'react';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, className, ...rest },
  ref
) {
  return (
    <label className={`radio ${className ?? ''}`.trim()} aria-label={label}>
      <input ref={ref} type="radio" {...rest} />
    </label>
  );
});
