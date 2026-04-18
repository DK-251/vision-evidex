import { forwardRef, type SelectHTMLAttributes } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface DropdownProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: ReadonlyArray<DropdownOption>;
  placeholder?: string;
}

/**
 * Native `<select>` styled to match the Fluent input (Docs §5.5). Uses
 * a native control rather than a portalled flyout because Electron's
 * renderer already has full OS focus/keyboard handling for native
 * selects and we don't need custom option rendering for any current
 * screen. When the Template-builder block palette lands we will add
 * a separate FluentMenu primitive — this one covers plain dropdowns.
 */
export const Dropdown = forwardRef<HTMLSelectElement, DropdownProps>(function Dropdown(
  { options, placeholder, className, value, ...rest },
  ref
) {
  return (
    <select
      ref={ref}
      className={`dropdown ${className ?? ''}`.trim()}
      value={value}
      {...rest}
    >
      {placeholder !== undefined && (
        <option value="" disabled hidden>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled ?? false}>
          {o.label}
        </option>
      ))}
    </select>
  );
});
