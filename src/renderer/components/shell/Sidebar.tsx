import {
  DataBarVerticalRegular,
  ImageMultipleRegular,
  DocumentBulletListRegular,
  DocumentTextRegular,
  ShieldCheckmarkRegular,
  SettingsRegular,
  NavigationRegular,
} from '@fluentui/react-icons';
import { useNavStore, type ShellPage } from '../../stores/nav-store';
import { NavItem } from './NavItem';

/**
 * Fluent navigation rail (Docs §5.6). Six destinations in the order
 * specified by the design system: Dashboard, Sessions, Templates,
 * Reports, Audit Pack, Settings (footer). Only Dashboard and Settings
 * are wired today — the rest render disabled and surface as "coming
 * soon" tooltips via the button title in collapsed mode. Screens for
 * the disabled items land in Wk6 + Phase 2/3/4 per the development
 * plan and will flip their `disabled` flag here when they exist.
 */

interface NavDestination {
  page: ShellPage | null; // null → disabled / coming soon
  icon: JSX.Element;
  label: string;
}

const MAIN_ITEMS: NavDestination[] = [
  { page: 'dashboard', icon: <DataBarVerticalRegular />,      label: 'Dashboard' },
  { page: null,        icon: <ImageMultipleRegular />,        label: 'Sessions' },
  { page: null,        icon: <DocumentBulletListRegular />,   label: 'Templates' },
  { page: null,        icon: <DocumentTextRegular />,         label: 'Reports' },
  { page: null,        icon: <ShieldCheckmarkRegular />,      label: 'Audit Pack' },
];

const FOOTER_ITEMS: NavDestination[] = [
  { page: 'settings', icon: <SettingsRegular />, label: 'Settings' },
];

export function Sidebar(): JSX.Element {
  const page = useNavStore((s) => s.page);
  const collapsed = useNavStore((s) => s.sidebarCollapsed);
  const navigate = useNavStore((s) => s.navigate);
  const toggleSidebar = useNavStore((s) => s.toggleSidebar);

  function renderItem(item: NavDestination): JSX.Element {
    const disabled = item.page === null;
    const active = item.page !== null && page === item.page;
    return (
      <NavItem
        key={item.label}
        icon={item.icon}
        label={item.label}
        active={active}
        collapsed={collapsed}
        disabled={disabled}
        onClick={disabled ? undefined : () => navigate(item.page!)}
      />
    );
  }

  return (
    <nav
      className={`nav-sidebar ${collapsed ? 'collapsed' : ''}`}
      aria-label="Primary navigation"
    >
      <button
        type="button"
        className="nav-sidebar-toggle"
        onClick={toggleSidebar}
        aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
      >
        <span className="nav-item-icon" aria-hidden="true">
          <NavigationRegular />
        </span>
        {!collapsed && <span className="nav-sidebar-toggle-label">Menu</span>}
      </button>
      {MAIN_ITEMS.map(renderItem)}
      <div className="nav-sidebar-spacer" aria-hidden="true" />
      {FOOTER_ITEMS.map(renderItem)}
    </nav>
  );
}
