import {
  DataBarVerticalRegular,
  DataBarVerticalFilled,
  FolderRegular,
  FolderFilled,
  ImageMultipleRegular,
  DocumentBulletListRegular,
  DocumentTextRegular,
  ShieldCheckmarkRegular,
  SettingsRegular,
  SettingsFilled,
  NavigationRegular,
} from '@fluentui/react-icons';
import { useNavStore, type ShellPage } from '../../stores/nav-store';
import { NavItem } from './NavItem';

/**
 * Fluent navigation rail (Docs §5.6). Wk 8 (AQ5) — Projects becomes the
 * first nav item and the post-onboarding home; Dashboard moves to slot
 * 2 and stays a metrics overview. Only Projects, Dashboard, and
 * Settings are wired today; the rest render disabled.
 */

interface NavDestination {
  page: ShellPage | null; // null → disabled / coming soon
  /** Pages that should also light up this item (e.g. create-project for Projects). */
  alsoActiveFor?: ShellPage[];
  icon: JSX.Element;
  /** Filled variant shown when item is active. */
  filledIcon?: JSX.Element;
  label: string;
  /** Tooltip shown on disabled items explaining when feature arrives. */
  title?: string;
}

const MAIN_ITEMS: NavDestination[] = [
  {
    page:           'project-list',
    alsoActiveFor:  ['create-project'],
    icon:           <FolderRegular />,
    filledIcon:     <FolderFilled />,
    label:          'Projects',
  },
  {
    page:       'dashboard',
    icon:       <DataBarVerticalRegular />,
    filledIcon: <DataBarVerticalFilled />,
    label:      'Dashboard',
  },
  {
    page:  null,
    icon:  <ImageMultipleRegular />,
    label: 'Sessions',
    title: 'Available after opening a project',
  },
  {
    page:  null,
    icon:  <DocumentBulletListRegular />,
    label: 'Templates',
    title: 'Coming in Phase 3',
  },
  {
    page:  null,
    icon:  <DocumentTextRegular />,
    label: 'Reports',
    title: 'Coming in Phase 3',
  },
  {
    page:  null,
    icon:  <ShieldCheckmarkRegular />,
    label: 'Audit Pack',
    title: 'Coming in Phase 4',
  },
];

const FOOTER_ITEMS: NavDestination[] = [
  {
    page:       'settings',
    icon:       <SettingsRegular />,
    filledIcon: <SettingsFilled />,
    label:      'Settings',
  },
];

export function Sidebar(): JSX.Element {
  const page = useNavStore((s) => s.page);
  const collapsed = useNavStore((s) => s.sidebarCollapsed);
  const navigate = useNavStore((s) => s.navigate);
  const toggleSidebar = useNavStore((s) => s.toggleSidebar);

  function renderItem(item: NavDestination): JSX.Element {
    const disabled = item.page === null;
    const active =
      item.page !== null &&
      (page === item.page || (item.alsoActiveFor ?? []).includes(page));
    // Use Filled icon variant when active (Regular = inactive, Filled = active).
    const icon = active && item.filledIcon ? item.filledIcon : item.icon;
    return (
      <NavItem
        key={item.label}
        icon={icon}
        label={item.label}
        active={active}
        collapsed={collapsed}
        disabled={disabled}
        title={item.title}
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
