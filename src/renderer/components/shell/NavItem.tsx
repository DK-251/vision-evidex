import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Tooltip } from '../ui/Tooltip';

/**
 * Single sidebar nav row (Docs §5.6). Active state gets a 3px accent
 * bar on the left edge and an accent-tinted background fill. Disabled
 * rows render with tertiary-text colour but remain in the DOM so the
 * sidebar's composition stays stable as destinations come online in
 * later phases.
 *
 * Tooltip behaviour: when collapsed, the `label` becomes the tooltip
 * content. An explicit `title` overrides — typically used for disabled
 * destinations to surface a "coming in Phase X" hint.
 */

export interface NavItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  icon: ReactNode;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  /** Tooltip — shown on disabled items. Overrides the collapsed label tooltip. */
  title?: string;
}

export const NavItem = forwardRef<HTMLButtonElement, NavItemProps>(function NavItem(
  { icon, label, active, collapsed, title, className, ...rest },
  ref
) {
  const tooltipContent = title ?? (collapsed ? label : undefined);
  const button = (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      className={`nav-item ${active ? 'active' : ''} ${className ?? ''}`.trim()}
      {...rest}
    >
      <span className="nav-item-icon" aria-hidden="true">
        {icon}
      </span>
      {!collapsed && <span className="nav-item-label">{label}</span>}
    </button>
  );
  if (!tooltipContent) return button;
  return (
    <Tooltip content={tooltipContent} placement="right">
      {button}
    </Tooltip>
  );
});
