import {
  ipcMain,
  dialog,
  BrowserWindow,
  type IpcMainInvokeEvent,
  type OpenDialogOptions,
} from 'electron';
import { ulid } from 'ulid';
import type { z } from 'zod';
import { IPC, IPC_EVENTS, type IpcChannel } from '@shared/ipc-channels';
import { EvidexError, isEvidexError } from '@shared/types/errors';
import { EvidexErrorCode, type IpcResult } from '@shared/types/ipc';
import {
  SessionIntakeSchema,
  SessionEndSchema,
  SessionGetSchema,
  CaptureRequestSchema,
  AnnotationSaveSchema,
  CaptureTagUpdateSchema,
  ProjectCreateSchema,
  ProjectOpenSchema,
  ProjectCloseSchema,
  ExportOptionsSchema,
  MetricsImportSchema,
  TemplateSaveSchema,
  SignOffSubmitSchema,
  LicenceActivateSchema,
  LicenceValidateSchema,
  SettingsGetSchema,
  SettingsUpdateSchema,
  BrandingSaveSchema,
  DialogSelectDirectorySchema,
  MetricsSummarySchema,
  RecentProjectsListSchema,
  WindowControlSchema,
} from '@shared/schemas';
import type { LicenceService } from './services/licence.service';
import type { SettingsService } from './services/settings.service';
import type { DatabaseService } from './services/database.service';
import type { MetricsService } from './services/metrics.service';
import type { SessionService } from './services/session.service';
import type { CaptureService } from './services/capture.service';
import type { EvidexContainerService } from './services/evidex-container.service';

export interface ServiceRegistry {
  licence: LicenceService;
  settings: SettingsService;
  appDb: DatabaseService;
  metrics: MetricsService;
  session: SessionService;
  capture: CaptureService;
  container: EvidexContainerService;
  /** Owner of the currently-focused BrowserWindow for modal dialogs. */
  getMainWindow: () => BrowserWindow | undefined;
}

/**
 * Project-size threshold for STORAGE_WARNING (Tech Spec §11). Default
 * .evidex budget is 20 MiB; we surface a warning at 75% — gives the
 * tester time to wrap the session before the hard cap kicks in.
 */
const PROJECT_SIZE_BUDGET_BYTES = 20 * 1024 * 1024;
const STORAGE_WARNING_THRESHOLD_PCT = 75;

function broadcast<T>(channel: string, payload?: T): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    if (payload === undefined) {
      win.webContents.send(channel);
    } else {
      win.webContents.send(channel, payload);
    }
  }
}

type Handler<TInput, TOutput> = (input: TInput, event: IpcMainInvokeEvent) => Promise<TOutput>;

export function registerHandler<TSchema extends z.ZodTypeAny, TOutput>(
  channel: IpcChannel,
  schema: TSchema,
  handler: Handler<z.infer<TSchema>, TOutput>
): void {
  ipcMain.handle(channel, async (event, rawInput: unknown): Promise<IpcResult<TOutput>> => {
    try {
      const parsed = schema.parse(rawInput);
      const data = await handler(parsed, event);
      return { ok: true, data };
    } catch (err) {
      if (isEvidexError(err)) {
        return {
          ok: false,
          error: {
            code: err.code,
            message: err.message,
            ...(err.fields !== undefined ? { fields: err.fields } : {}),
          },
        };
      }
      if (err && typeof err === 'object' && 'issues' in err) {
        // Zod validation error
        const zerr = err as { issues: Array<{ path: (string | number)[]; message: string }> };
        const fields: Record<string, string> = {};
        for (const issue of zerr.issues) {
          fields[issue.path.join('.')] = issue.message;
        }
        return {
          ok: false,
          error: {
            code: EvidexErrorCode.VALIDATION_FAILED,
            message: 'Input validation failed',
            fields,
          },
        };
      }
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        error: { code: EvidexErrorCode.UNKNOWN_ERROR, message },
      };
    }
  });
}

export function registerAllHandlers(services: ServiceRegistry): void {
  const stub = async (): Promise<null> => null;

  registerHandler(IPC.SESSION_CREATE, SessionIntakeSchema, async (intake) => {
    // Zod's optional() yields `T | undefined`; the service input type uses
    // `?:` semantics under exactOptionalPropertyTypes — strip undefined keys.
    const { testDataMatrix, scenario, requirementId, requirementDesc, testerEmail, ...required } = intake;
    return services.session.create({
      ...required,
      ...(testDataMatrix !== undefined ? { testDataMatrix } : {}),
      ...(scenario !== undefined ? { scenario } : {}),
      ...(requirementId !== undefined ? { requirementId } : {}),
      ...(requirementDesc !== undefined ? { requirementDesc } : {}),
      ...(testerEmail !== undefined ? { testerEmail } : {}),
    });
  });
  registerHandler(IPC.SESSION_END, SessionEndSchema, async (input) =>
    services.session.end(input.sessionId)
  );
  registerHandler(IPC.SESSION_GET, SessionGetSchema, async (input) =>
    services.session.get(input.sessionId)
  );
  registerHandler(IPC.CAPTURE_SCREENSHOT, CaptureRequestSchema, async (input) => {
    // 1. Session must exist and still be active.
    const session = services.session.get(input.sessionId);
    if (!session) {
      throw new EvidexError(
        EvidexErrorCode.SESSION_NOT_FOUND,
        `Session ${input.sessionId} not found`,
        { sessionId: input.sessionId }
      );
    }
    if (session.endedAt !== undefined) {
      throw new EvidexError(
        EvidexErrorCode.SESSION_NOT_ACTIVE,
        `Session ${input.sessionId} has already ended`,
        { sessionId: input.sessionId, endedAt: session.endedAt }
      );
    }

    // 2. Resolve the active container (single-slot per Rule 11). When
    //    no container is open we are in pre-Project-open mode — let the
    //    pipeline run anyway; CaptureService will fail at addImage and
    //    the error propagates as IpcResult. That is the expected D35
    //    plumbing-mode behaviour per AQ5.
    const handle = services.container.getCurrentHandle();
    const containerOpenForSession =
      handle !== null && handle.projectId === session.projectId;
    if (!containerOpenForSession) {
      // eslint-disable-next-line no-console
      console.warn(
        '[ipc-router] CAPTURE_SCREENSHOT — no container open for project',
        { projectId: session.projectId, hasHandle: handle !== null }
      );
    }

    // 3. Fire the pipeline. CaptureService resolves the rest of the
    //    context (projectName, clientName, containerId, sequenceNum)
    //    via the SessionLookup adapter wired in app.ts.
    const { region, ...rest } = input;
    const result = await services.capture.screenshot({
      ...rest,
      ...(region !== undefined ? { region } : {}),
    });

    // 4. Push the live counter update + flash to all windows.
    const updated = services.session.get(input.sessionId);
    if (updated) {
      broadcast(IPC_EVENTS.SESSION_STATUS_UPDATE, {
        sessionId:    updated.id,
        captureCount: updated.captureCount,
        passCount:    updated.passCount,
        failCount:    updated.failCount,
        blockedCount: updated.blockedCount,
      });
    }
    broadcast(IPC_EVENTS.CAPTURE_FLASH);

    // 5. Storage warning. Skipped when no real container — getSizeBytes
    //    needs an open handle.
    if (containerOpenForSession && handle) {
      try {
        const sizeBytes = await services.container.getSizeBytes(handle.containerId);
        const pct = Math.round((sizeBytes / PROJECT_SIZE_BUDGET_BYTES) * 100);
        if (pct >= STORAGE_WARNING_THRESHOLD_PCT) {
          broadcast(IPC_EVENTS.STORAGE_WARNING, pct);
        }
      } catch {
        // size check failures must not poison the capture response
      }
    }

    return result;
  });
  registerHandler(IPC.CAPTURE_ANNOTATE_SAVE, AnnotationSaveSchema, stub);
  registerHandler(IPC.CAPTURE_TAG_UPDATE, CaptureTagUpdateSchema, async (input) => {
    services.capture.updateTag(input.captureId, input.tag);
    return null;
  });
  registerHandler(IPC.PROJECT_CREATE, ProjectCreateSchema, stub);
  registerHandler(IPC.PROJECT_OPEN, ProjectOpenSchema, stub);
  registerHandler(IPC.PROJECT_CLOSE, ProjectCloseSchema, stub);
  registerHandler(IPC.EXPORT_WORD, ExportOptionsSchema, stub);
  registerHandler(IPC.EXPORT_PDF, ExportOptionsSchema, stub);
  registerHandler(IPC.EXPORT_HTML, ExportOptionsSchema, stub);
  registerHandler(IPC.EXPORT_AUDIT_BUNDLE, ExportOptionsSchema, stub);
  registerHandler(IPC.METRICS_IMPORT, MetricsImportSchema, stub);
  registerHandler(IPC.TEMPLATE_SAVE, TemplateSaveSchema, stub);
  registerHandler(IPC.SIGNOFF_SUBMIT, SignOffSubmitSchema, stub);

  registerHandler(IPC.LICENCE_ACTIVATE, LicenceActivateSchema, (input) =>
    services.licence.activate(input)
  );
  registerHandler(IPC.LICENCE_VALIDATE, LicenceValidateSchema, async () =>
    services.licence.validate()
  );

  registerHandler(IPC.SETTINGS_GET, SettingsGetSchema, async () =>
    services.settings.getSettings()
  );
  registerHandler(IPC.SETTINGS_UPDATE, SettingsUpdateSchema, async (partial) => {
    const normalizedProfile =
      partial.profile === undefined
        ? undefined
        : {
            name: partial.profile.name,
            role: partial.profile.role,
            ...(partial.profile.team !== undefined ? { team: partial.profile.team } : {}),
            ...(partial.profile.email !== undefined ? { email: partial.profile.email } : {}),
          };

    const normalized = {
      ...(partial.onboardingComplete !== undefined
        ? { onboardingComplete: partial.onboardingComplete }
        : {}),
      ...(partial.theme !== undefined ? { theme: partial.theme } : {}),
      ...(partial.defaultStoragePath !== undefined
        ? { defaultStoragePath: partial.defaultStoragePath }
        : {}),
      ...(partial.defaultTemplateId !== undefined
        ? { defaultTemplateId: partial.defaultTemplateId }
        : {}),
      ...(normalizedProfile !== undefined ? { profile: normalizedProfile } : {}),
      ...(partial.hotkeys !== undefined ? { hotkeys: partial.hotkeys } : {}),
      ...(partial.brandingProfileId !== undefined
        ? { brandingProfileId: partial.brandingProfileId }
        : {}),
    };
    return services.settings.saveSettings(normalized);
  });

  registerHandler(IPC.BRANDING_SAVE, BrandingSaveSchema, async (input) => {
    const profile = {
      id: input.id ?? `brand_${ulid()}`,
      name: input.name,
      companyName: input.companyName,
      logoBase64: input.logoBase64,
      logoMimeType: input.logoMimeType,
      primaryColor: input.primaryColor,
      ...(input.headerText !== undefined ? { headerText: input.headerText } : {}),
      ...(input.footerText !== undefined ? { footerText: input.footerText } : {}),
    };
    return services.appDb.saveBrandingProfile(profile);
  });

  registerHandler(IPC.METRICS_SUMMARY, MetricsSummarySchema, async () =>
    services.metrics.summary()
  );
  registerHandler(IPC.RECENT_PROJECTS_LIST, RecentProjectsListSchema, async () =>
    services.appDb.getRecentProjects()
  );

  registerHandler(IPC.WINDOW_MINIMIZE, WindowControlSchema, async () => {
    services.getMainWindow()?.minimize();
    return null;
  });
  registerHandler(IPC.WINDOW_MAXIMIZE_TOGGLE, WindowControlSchema, async () => {
    const win = services.getMainWindow();
    if (!win) return null;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
    return null;
  });
  registerHandler(IPC.WINDOW_CLOSE, WindowControlSchema, async () => {
    services.getMainWindow()?.close();
    return null;
  });
  registerHandler(IPC.WINDOW_IS_MAXIMIZED, WindowControlSchema, async () => {
    return services.getMainWindow()?.isMaximized() ?? false;
  });

  registerHandler(IPC.DIALOG_SELECT_DIRECTORY, DialogSelectDirectorySchema, async (input) => {
    const win = services.getMainWindow();
    const options: OpenDialogOptions = {
      properties: ['openDirectory', 'createDirectory'],
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.defaultPath !== undefined ? { defaultPath: input.defaultPath } : {}),
    };
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options);
    return {
      path: result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]!,
    };
  });

  // eslint-disable-next-line no-console
  console.info(`[ipc-router] ${Object.values(IPC).length} handlers registered (16 live, 12 stub)`);
}

/**
 * Throw helper for services — keeps call sites terse.
 *   throwEvidex('SESSION_NOT_FOUND', 'no active session');
 */
export function throwEvidex(code: EvidexErrorCode, message: string, fields?: Record<string, string>): never {
  throw new EvidexError(code, message, fields);
}
