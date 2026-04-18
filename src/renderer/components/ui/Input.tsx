import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

/**
 * Fluent text input. `invalid` sets the red bottom border + writes
 * `aria-invalid='true'` for screen readers. Callers render the error
 * message themselves below the field as type-caption danger.
 */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={`input ${className ?? ''}`.trim()}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={`input input-multiline ${className ?? ''}`.trim()}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
});
