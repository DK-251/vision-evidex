import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

/**
 * Single sidebar nav row (Docs §5.6). Active state gets a 3px accent
 * bar on the left edge and an accent-tinted background fill. Disabled
 * rows render with tertiary-text colour but remain in the DOM so the
 * sidebar's composition stays stable as destinations come online in
 * later phases.
 */

export interface NavItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  icon: ReactNode;
  label: string;
  active?: boolean;
  collapsed?: boolean;
}

export const NavItem = forwardRef<HTMLButtonElement, NavItemProps>(function NavItem(
  { icon, label, active, collapsed, className, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className={`nav-item ${active ? 'active' : ''} ${className ?? ''}`.trim()}
      {...rest}
    >
      <span className="nav-item-icon" aria-hidden="true">
        {icon}
      </span>
      {!collapsed && <span className="nav-item-label">{label}</span>}
    </button>
  );
});
