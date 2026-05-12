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
  SessionListSchema,
  CaptureListSchema,
  CaptureGetThumbnailSchema,
  CaptureRequestSchema,
  AnnotationSaveSchema,
  CaptureTagUpdateSchema,
  ProjectCreateSchema,
  ProjectOpenSchema,
  ProjectCloseSchema,
  ProjectGetSchema,
  ProjectListSchema,
  ProjectRecentSchema,
  ProjectUpdateSchema,
  CaptureOpenAnnotationSchema,
  ExportOptionsSchema,
  MetricsImportSchema,
  TemplateSaveSchema,
  TemplateListSchema,
  SignOffSubmitSchema,
  LicenceActivateSchema,
  LicenceValidateSchema,
  SettingsGetSchema,
  SettingsUpdateSchema,
  BrandingSaveSchema,
  BrandingListSchema,
  DialogSelectDirectorySchema,
  DialogOpenFolderSchema,
  NamingPreviewSchema,
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
import type { ProjectService } from './services/project.service';
import type { NamingService } from './services/naming.service';
import {
  createAnnotationWindow,
  getAnnotationWindow,
} from './window-manager';

export interface ServiceRegistry {
  licence: LicenceService;
  settings: SettingsService;
  appDb: DatabaseService;
  metrics: MetricsService;
  session: SessionService;
  capture: CaptureService;
  container: EvidexContainerService;
  /** Wk 8 — project create/open/close/list. */
  project: ProjectService;
  /** Wk 8 — naming pattern preview (CreateProjectPage live preview). */
  naming: NamingService;
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
  registerHandler(IPC.SESSION_LIST, SessionListSchema, async (input) =>
    services.session.getAll(input.projectId)
  );
  registerHandler(IPC.CAPTURE_LIST, CaptureListSchema, async (input) =>
    services.capture.getForSession(input.sessionId)
  );
  registerHandler(IPC.CAPTURE_GET_THUMBNAIL, CaptureGetThumbnailSchema, async (input) =>
    services.capture.getThumbnail(input.captureId)
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

    // 2. Fire the pipeline. CaptureService's own getDb-guard surfaces
    //    PROJECT_NOT_FOUND if no container is open for this session,
    //    so we no longer need the pre-Wk8 NO_CONTAINER sentinel branch.
    //    SessionLookup (app.ts) reads projectName / clientName from the
    //    per-container project DB.
    const { region, ...rest } = input;
    const result = await services.capture.screenshot({
      ...rest,
      ...(region !== undefined ? { region } : {}),
    });

    // 3. Push the live counter update + flash to all windows. Plus
    //    CAPTURE_ARRIVED with the full CaptureResult so the gallery
    //    appends a real thumbnail without a refetch round trip.
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
    broadcast(IPC_EVENTS.CAPTURE_ARRIVED, result);

    // 4. Storage warning — getSizeBytes needs an open handle which is
    //    guaranteed by the time we reach this point (capture.screenshot
    //    above would have thrown otherwise).
    const handle = services.container.getCurrentHandle();
    if (handle && handle.projectId === session.projectId) {
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
  // ─── Project (Wk 8 — wired to ProjectService) ─────────────────────
  registerHandler(IPC.PROJECT_CREATE, ProjectCreateSchema, async (input) => {
    // Same Zod-optional → exactOptional dance as session:create.
    const { description, ...rest } = input;
    return services.project.create({
      ...rest,
      ...(description !== undefined ? { description } : {}),
    });
  });
  registerHandler(IPC.PROJECT_OPEN, ProjectOpenSchema, async (input) =>
    services.project.open(input.filePath)
  );
  registerHandler(IPC.PROJECT_CLOSE, ProjectCloseSchema, async (input) => {
    await services.project.close(input.projectId);
    return null;
  });
  registerHandler(IPC.PROJECT_GET, ProjectGetSchema, async (input) =>
    services.project.get(input.projectId)
  );
  registerHandler(IPC.PROJECT_LIST, ProjectListSchema, async () =>
    services.project.list()
  );
  registerHandler(IPC.PROJECT_RECENT, ProjectRecentSchema, async () =>
    services.project.getRecent()
  );
  registerHandler(IPC.PROJECT_UPDATE, ProjectUpdateSchema, async (input) =>
    services.project.update(input.projectId, input.patch)
  );
  registerHandler(IPC.CAPTURE_OPEN_ANNOTATION, CaptureOpenAnnotationSchema, async (input) => {
    const db = services.container.getProjectDb();
    const capture = db?.getCapture(input.captureId) ?? null;
    if (!capture) throw new EvidexError(EvidexErrorCode.PROJECT_NOT_FOUND, 'Capture not found', { captureId: input.captureId });
    const handle = services.container.getCurrentHandle();
    if (!handle) throw new EvidexError(EvidexErrorCode.PROJECT_NOT_FOUND, 'No project open');
    const imageData = await services.container.extractImage(handle.containerId, `images/original/${capture.originalFilename}`);
    if (!imageData) throw new EvidexError(EvidexErrorCode.PROJECT_NOT_FOUND, 'Image not found in container', { captureId: input.captureId });
    const win = getAnnotationWindow()?.isDestroyed() === false ? getAnnotationWindow()! : createAnnotationWindow();
    const payload = {
      captureId:   capture.id,
      imageBase64: `data:image/jpeg;base64,${imageData.toString('base64')}`,
      width: 1920,
      height: 1080,
    };
    const push = (): void => { if (!win.isDestroyed()) win.webContents.send(IPC_EVENTS.ANNOTATION_LOAD, payload); };
    if (win.webContents.isLoading()) win.webContents.once('did-finish-load', push);
    else push();
    return null;
  });
  registerHandler(IPC.EXPORT_WORD, ExportOptionsSchema, stub);
  registerHandler(IPC.EXPORT_PDF, ExportOptionsSchema, stub);
  registerHandler(IPC.EXPORT_HTML, ExportOptionsSchema, stub);
  registerHandler(IPC.EXPORT_AUDIT_BUNDLE, ExportOptionsSchema, stub);
  registerHandler(IPC.METRICS_IMPORT, MetricsImportSchema, stub);
  registerHandler(IPC.TEMPLATE_SAVE, TemplateSaveSchema, stub);
  registerHandler(IPC.TEMPLATE_LIST, TemplateListSchema, async () =>
    services.appDb.getTemplates()
  );
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

  registerHandler(IPC.BRANDING_LIST, BrandingListSchema, async () =>
    services.appDb.getBrandingProfiles()
  );

  registerHandler(IPC.NAMING_PREVIEW, NamingPreviewSchema, async (input) => {
    const ctx: { projectName?: string; clientName?: string } = {};
    if (input.projectName !== undefined) ctx.projectName = input.projectName;
    if (input.clientName !== undefined) ctx.clientName = input.clientName;
    return services.naming.preview(input.pattern, ctx);
  });

  registerHandler(IPC.DIALOG_OPEN_FOLDER, DialogOpenFolderSchema, async (input) => {
    const win = services.getMainWindow();
    const options: OpenDialogOptions = {
      properties: ['openDirectory', 'createDirectory'],
      ...(input.title !== undefined ? { title: input.title } : { title: 'Choose folder' }),
      ...(input.defaultPath !== undefined ? { defaultPath: input.defaultPath } : {}),
    };
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options);
    return {
      cancelled: result.canceled,
      path: result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]!,
    };
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
  console.info(`[ipc-router] ${Object.values(IPC).length} handlers registered`);
}

/**
 * Throw helper for services — keeps call sites terse.
 *   throwEvidex('SESSION_NOT_FOUND', 'no active session');
 */
export function throwEvidex(code: EvidexErrorCode, message: string, fields?: Record<string, string>): never {
  throw new EvidexError(code, message, fields);
}
