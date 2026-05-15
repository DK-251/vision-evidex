/**
 * IPC channel constants. Single source of truth for main ↔ renderer comms.
 * Renderer invoke channels are Zod-validated in the main-process router.
 * Event push channels are main → renderer only (no request/response).
 */

export const IPC = {
  // Session
  SESSION_CREATE: 'session:create',
  SESSION_END: 'session:end',
  SESSION_GET: 'session:get',
  SESSION_START_REGION_CAPTURE: 'session:startRegionCapture', // §13: toolbar region button
  SESSION_LIST: 'session:list',          // W9 — list all sessions for a project
  CAPTURE_LIST: 'capture:list',          // W9 — list all captures for a session

  // Capture
  CAPTURE_SCREENSHOT: 'capture:screenshot',
  CAPTURE_GET_THUMBNAIL: 'capture:thumbnail', // W9 — load thumbnail for historical capture
  CAPTURE_ANNOTATE_SAVE: 'capture:annotate:save',
  CAPTURE_TAG_UPDATE: 'capture:tag:update',
  CAPTURE_OPEN_ANNOTATION: 'capture:openAnnotation',  // W10 — open annotation editor window

  // Annotation (separate BrowserWindow renderer)
  ANNOTATION_SAVE: 'annotation:save',             // W10 — annotation renderer sends composite back

  // Project
  PROJECT_CREATE: 'project:create',
  PROJECT_OPEN: 'project:open',
  PROJECT_CLOSE: 'project:close',
  PROJECT_GET: 'project:get',
  PROJECT_LIST: 'project:list',
  PROJECT_RECENT: 'project:recent',
  PROJECT_UPDATE: 'project:update',               // W10 — PM-03 rename / re-client

  // Export
  EXPORT_WORD: 'export:word',
  EXPORT_PDF: 'export:pdf',
  EXPORT_HTML: 'export:html',
  EXPORT_AUDIT_BUNDLE: 'export:auditBundle',

  // Metrics
  METRICS_IMPORT: 'metrics:import',

  // Template
  TEMPLATE_SAVE: 'template:save',
  TEMPLATE_LIST: 'template:list',

  // Sign-off
  SIGNOFF_SUBMIT: 'signoff:submit',

  // Licence
  LICENCE_ACTIVATE: 'licence:activate',
  LICENCE_VALIDATE: 'licence:validate',

  // Settings + branding + dialogs
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  BRANDING_SAVE: 'branding:save',
  BRANDING_LIST: 'branding:list',
  DIALOG_SELECT_DIRECTORY: 'dialog:selectDirectory',
  DIALOG_OPEN_FOLDER: 'dialog:openFolder',

  // Naming pattern preview (CreateProjectPage live preview)
  NAMING_PREVIEW: 'naming:preview',

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
  /**
   * Wk 8 — fired after a successful capture pipeline. Carries the full
   * `CaptureResult` so the gallery can append the new thumbnail in
   * real time (the GallerySkeleton transitions to a real
   * CaptureThumbnail without a refetch round trip).
   */
  CAPTURE_ARRIVED: 'capture:arrived',
  SESSION_STATUS_UPDATE: 'session:statusUpdate',
  SESSION_ENDED:          'session:ended',        // §13 — broadcast after toolbar-initiated session end
  STORAGE_WARNING: 'storage:warning',
  APP_UPDATE_AVAILABLE: 'app:updateAvailable',
  THEME_ACCENT_COLOUR_UPDATE: 'theme:accentColourUpdate',
  THEME_SYSTEM_CHANGE: 'theme:systemThemeChange',
  WINDOW_MAXIMIZED_CHANGE: 'window:maximizedChange',
  REGION_SELECTED: 'region:selected',  // W10 — region renderer → main with selected Rect
  REGION_CANCEL:   'region:cancel',    // W10 — region renderer cancels via Esc
  ANNOTATION_LOAD: 'annotation:load',  // W10 — main sends image to annotation renderer
} as const;

export type IpcChannel = typeof IPC[keyof typeof IPC];
export type IpcEventChannel = typeof IPC_EVENTS[keyof typeof IPC_EVENTS];
