/**
 * IPC channel constants. Single source of truth for main ↔ renderer comms.
 * Renderer invoke channels are Zod-validated in the main-process router.
 * Event push channels are main → renderer only (no request/response).
 */

export const IPC = {
  // Session
  SESSION_CREATE: 'session:create',
  SESSION_END: 'session:end',

  // Capture
  CAPTURE_SCREENSHOT: 'capture:screenshot',
  CAPTURE_ANNOTATE_SAVE: 'capture:annotate:save',
  CAPTURE_TAG_UPDATE: 'capture:tag:update',

  // Project
  PROJECT_CREATE: 'project:create',
  PROJECT_OPEN: 'project:open',
  PROJECT_CLOSE: 'project:close',

  // Export
  EXPORT_WORD: 'export:word',
  EXPORT_PDF: 'export:pdf',
  EXPORT_HTML: 'export:html',
  EXPORT_AUDIT_BUNDLE: 'export:auditBundle',

  // Metrics
  METRICS_IMPORT: 'metrics:import',

  // Template
  TEMPLATE_SAVE: 'template:save',

  // Sign-off
  SIGNOFF_SUBMIT: 'signoff:submit',

  // Licence
  LICENCE_ACTIVATE: 'licence:activate',
  LICENCE_VALIDATE: 'licence:validate',

  // Settings + branding + dialogs
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  BRANDING_SAVE: 'branding:save',
  DIALOG_SELECT_DIRECTORY: 'dialog:selectDirectory',

  // Dashboard metrics + recent projects
  METRICS_SUMMARY: 'metrics:summary',
  RECENT_PROJECTS_LIST: 'recentProjects:list',

  // Custom title bar — window controls (renderer → main)
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE_TOGGLE: 'window:maximizeToggle',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:isMaximized',
} as const;

export const IPC_EVENTS = {
  // main → renderer push events (no reply)
  CAPTURE_FLASH: 'capture:flash',
  SESSION_STATUS_UPDATE: 'session:statusUpdate',
  STORAGE_WARNING: 'storage:warning',
  APP_UPDATE_AVAILABLE: 'app:updateAvailable',
  THEME_ACCENT_COLOUR_UPDATE: 'theme:accentColourUpdate',
  THEME_SYSTEM_CHANGE: 'theme:systemThemeChange',
  WINDOW_MAXIMIZED_CHANGE: 'window:maximizedChange',
} as const;

export type IpcChannel = typeof IPC[keyof typeof IPC];
export type IpcEventChannel = typeof IPC_EVENTS[keyof typeof IPC_EVENTS];
