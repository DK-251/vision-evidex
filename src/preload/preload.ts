import { contextBridge, ipcRenderer } from 'electron';
import { IPC, IPC_EVENTS } from '@shared/ipc-channels';
import type { IpcResult } from '@shared/types/ipc';
import type {
  Session,
  SessionIntakeInput,
  SessionSummary,
  SessionStatus,
  CaptureRequestInput,
  CaptureResult,
  AnnotationSaveInput,
  AnnotationResult,
  StatusTag,
  Project,
  ExportOptionsInput,
  ExportResult,
  MetricsImportInput,
  ImportedMetrics,
  TemplateSaveInput,
  Template,
  SignOffSubmitInput,
  SignOff,
  LicenceActivateInput,
  ActivationResult,
  LicenceValidationResult,
  Settings,
  BrandingProfile,
  MetricsSummary,
  RecentProject,
} from '@shared/types/entities';
import type { SettingsUpdateInput, BrandingSaveInput, ProjectCreateInput } from '@shared/schemas';

/**
 * Preload bridge — the ONLY surface the renderer uses to talk to main.
 *
 * Architectural Rule 1: renderer never imports from src/main/.
 * All communication flows through `window.evidexAPI` exposed below.
 * Sandbox mode is ON — this file must not import Node.js APIs beyond
 * what `electron` provides (`contextBridge`, `ipcRenderer`).
 */

const evidexAPI = {
  session: {
    create: (input: SessionIntakeInput): Promise<IpcResult<Session>> =>
      ipcRenderer.invoke(IPC.SESSION_CREATE, input),
    end: (sessionId: string): Promise<IpcResult<SessionSummary>> =>
      ipcRenderer.invoke(IPC.SESSION_END, { sessionId }),
    get: (sessionId: string): Promise<IpcResult<Session | null>> =>
      ipcRenderer.invoke(IPC.SESSION_GET, { sessionId }),
  },

  capture: {
    screenshot: (request: CaptureRequestInput): Promise<IpcResult<CaptureResult>> =>
      ipcRenderer.invoke(IPC.CAPTURE_SCREENSHOT, request),
    saveAnnotation: (request: AnnotationSaveInput): Promise<IpcResult<AnnotationResult>> =>
      ipcRenderer.invoke(IPC.CAPTURE_ANNOTATE_SAVE, request),
    updateTag: (captureId: string, tag: StatusTag): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(IPC.CAPTURE_TAG_UPDATE, { captureId, tag }),
  },

  project: {
    create: (input: ProjectCreateInput): Promise<IpcResult<Project>> =>
      ipcRenderer.invoke(IPC.PROJECT_CREATE, input),
    open: (filePath: string): Promise<IpcResult<{ project: Project; handle: { containerId: string; projectId: string; filePath: string; openedAt: string } }>> =>
      ipcRenderer.invoke(IPC.PROJECT_OPEN, { filePath }),
    close: (projectId: string): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(IPC.PROJECT_CLOSE, { projectId }),
    get: (projectId: string): Promise<IpcResult<Project | null>> =>
      ipcRenderer.invoke(IPC.PROJECT_GET, { projectId }),
    list: (): Promise<IpcResult<Project[]>> =>
      ipcRenderer.invoke(IPC.PROJECT_LIST, {}),
    getRecent: (): Promise<IpcResult<RecentProject[]>> =>
      ipcRenderer.invoke(IPC.PROJECT_RECENT, {}),
    previewNamingPattern: (
      input: { pattern: string; projectName?: string; clientName?: string }
    ): Promise<IpcResult<string>> =>
      ipcRenderer.invoke(IPC.NAMING_PREVIEW, input),
  },

  export: {
    word: (options: ExportOptionsInput): Promise<IpcResult<ExportResult>> =>
      ipcRenderer.invoke(IPC.EXPORT_WORD, options),
    pdf: (options: ExportOptionsInput): Promise<IpcResult<ExportResult>> =>
      ipcRenderer.invoke(IPC.EXPORT_PDF, options),
    html: (options: ExportOptionsInput): Promise<IpcResult<ExportResult>> =>
      ipcRenderer.invoke(IPC.EXPORT_HTML, options),
    auditBundle: (options: ExportOptionsInput): Promise<IpcResult<ExportResult>> =>
      ipcRenderer.invoke(IPC.EXPORT_AUDIT_BUNDLE, options),
  },

  metrics: {
    import: (input: MetricsImportInput): Promise<IpcResult<ImportedMetrics>> =>
      ipcRenderer.invoke(IPC.METRICS_IMPORT, input),
  },

  template: {
    save: (input: TemplateSaveInput): Promise<IpcResult<Template>> =>
      ipcRenderer.invoke(IPC.TEMPLATE_SAVE, input),
    list: (): Promise<IpcResult<Template[]>> =>
      ipcRenderer.invoke(IPC.TEMPLATE_LIST, {}),
  },

  signoff: {
    submit: (input: SignOffSubmitInput): Promise<IpcResult<SignOff>> =>
      ipcRenderer.invoke(IPC.SIGNOFF_SUBMIT, input),
  },

  licence: {
    activate: (input: LicenceActivateInput): Promise<IpcResult<ActivationResult>> =>
      ipcRenderer.invoke(IPC.LICENCE_ACTIVATE, input),
    validate: (): Promise<IpcResult<LicenceValidationResult>> =>
      ipcRenderer.invoke(IPC.LICENCE_VALIDATE, {}),
  },

  settings: {
    get: (): Promise<IpcResult<Settings>> => ipcRenderer.invoke(IPC.SETTINGS_GET, {}),
    update: (patch: SettingsUpdateInput): Promise<IpcResult<Settings>> =>
      ipcRenderer.invoke(IPC.SETTINGS_UPDATE, patch),
  },

  branding: {
    save: (input: BrandingSaveInput): Promise<IpcResult<BrandingProfile>> =>
      ipcRenderer.invoke(IPC.BRANDING_SAVE, input),
    list: (): Promise<IpcResult<BrandingProfile[]>> =>
      ipcRenderer.invoke(IPC.BRANDING_LIST, {}),
  },

  dialog: {
    selectDirectory: (
      input: { title?: string; defaultPath?: string } = {}
    ): Promise<IpcResult<{ path: string | null }>> =>
      ipcRenderer.invoke(IPC.DIALOG_SELECT_DIRECTORY, input),
    openFolder: (
      input: { title?: string; defaultPath?: string } = {}
    ): Promise<IpcResult<{ cancelled: boolean; path: string | null }>> =>
      ipcRenderer.invoke(IPC.DIALOG_OPEN_FOLDER, input),
  },

  windowControls: {
    minimize: (): Promise<IpcResult<null>> => ipcRenderer.invoke(IPC.WINDOW_MINIMIZE, {}),
    maximizeToggle: (): Promise<IpcResult<null>> =>
      ipcRenderer.invoke(IPC.WINDOW_MAXIMIZE_TOGGLE, {}),
    close: (): Promise<IpcResult<null>> => ipcRenderer.invoke(IPC.WINDOW_CLOSE, {}),
    isMaximized: (): Promise<IpcResult<boolean>> =>
      ipcRenderer.invoke(IPC.WINDOW_IS_MAXIMIZED, {}),
  },

  dashboard: {
    summary: (): Promise<IpcResult<MetricsSummary>> =>
      ipcRenderer.invoke(IPC.METRICS_SUMMARY, {}),
    recentProjects: (): Promise<IpcResult<RecentProject[]>> =>
      ipcRenderer.invoke(IPC.RECENT_PROJECTS_LIST, {}),
  },

  events: {
    onCaptureFlash: (handler: () => void): (() => void) => {
      const listener = (): void => handler();
      ipcRenderer.on(IPC_EVENTS.CAPTURE_FLASH, listener);
      return () => ipcRenderer.removeListener(IPC_EVENTS.CAPTURE_FLASH, listener);
    },
    onCaptureArrived: (handler: (capture: CaptureResult) => void): (() => void) => {
      const listener = (_e: unknown, capture: CaptureResult): void => handler(capture);
      ipcRenderer.on(IPC_EVENTS.CAPTURE_ARRIVED, listener);
      return () => ipcRenderer.removeListener(IPC_EVENTS.CAPTURE_ARRIVED, listener);
    },
    onSessionStatusUpdate: (handler: (status: SessionStatus) => void): (() => void) => {
      const listener = (_e: unknown, status: SessionStatus): void => handler(status);
      ipcRenderer.on(IPC_EVENTS.SESSION_STATUS_UPDATE, listener);
      return () => ipcRenderer.removeListener(IPC_EVENTS.SESSION_STATUS_UPDATE, listener);
    },
    onStorageWarning: (handler: (pct: number) => void): (() => void) => {
      const listener = (_e: unknown, pct: number): void => handler(pct);
      ipcRenderer.on(IPC_EVENTS.STORAGE_WARNING, listener);
      return () => ipcRenderer.removeListener(IPC_EVENTS.STORAGE_WARNING, listener);
    },
    onUpdateAvailable: (handler: (info: { version: string }) => void): (() => void) => {
      const listener = (_e: unknown, info: { version: string }): void => handler(info);
      ipcRenderer.on(IPC_EVENTS.APP_UPDATE_AVAILABLE, listener);
      return () => ipcRenderer.removeListener(IPC_EVENTS.APP_UPDATE_AVAILABLE, listener);
    },
    onAccentColourUpdate: (handler: (accent: string) => void): (() => void) => {
      const listener = (_e: unknown, accent: string): void => handler(accent);
      ipcRenderer.on(IPC_EVENTS.THEME_ACCENT_COLOUR_UPDATE, listener);
      return () => ipcRenderer.removeListener(IPC_EVENTS.THEME_ACCENT_COLOUR_UPDATE, listener);
    },
    onSystemThemeChange: (handler: (shouldUseDark: boolean) => void): (() => void) => {
      const listener = (_e: unknown, shouldUseDark: boolean): void => handler(shouldUseDark);
      ipcRenderer.on(IPC_EVENTS.THEME_SYSTEM_CHANGE, listener);
      return () => ipcRenderer.removeListener(IPC_EVENTS.THEME_SYSTEM_CHANGE, listener);
    },
    onMaximizedChange: (handler: (maximized: boolean) => void): (() => void) => {
      const listener = (_e: unknown, maximized: boolean): void => handler(maximized);
      ipcRenderer.on(IPC_EVENTS.WINDOW_MAXIMIZED_CHANGE, listener);
      return () => ipcRenderer.removeListener(IPC_EVENTS.WINDOW_MAXIMIZED_CHANGE, listener);
    },
  },
} as const;

export type EvidexAPI = typeof evidexAPI;

contextBridge.exposeInMainWorld('evidexAPI', evidexAPI);

declare global {
  interface Window {
    readonly evidexAPI: EvidexAPI;
  }
}
