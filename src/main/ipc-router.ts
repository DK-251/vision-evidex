import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import type { z } from 'zod';
import { IPC, type IpcChannel } from '@shared/ipc-channels';
import { EvidexError, isEvidexError } from '@shared/types/errors';
import { EvidexErrorCode, type IpcResult } from '@shared/types/ipc';
import {
  SessionIntakeSchema,
  SessionEndSchema,
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
} from '@shared/schemas';
import type { LicenceService } from './services/licence.service';

/**
 * Service registry injected into `registerAllHandlers`. Additional
 * services join this shape as they land (Wk 4 container, Wk 6
 * project, Phase 2 session/capture, …).
 */
export interface ServiceRegistry {
  licence: LicenceService;
}

/**
 * Central IPC router — registers every invoke channel with Zod validation
 * and consistent IpcResult<T> wrapping. Handlers never throw across the
 * IPC boundary (Architectural Rule 3).
 */

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

/**
 * Register all IPC handlers.
 *
 * Phase 1 Week 3 (D13): every channel is registered with its real Zod
 * schema. Unwired handlers return `null` until the owning service
 * lands — Zod rejection paths are live immediately, so the validation
 * envelope works end-to-end from the first app boot.
 *
 * Phase 1 Week 4 (D16): `licence:activate` / `licence:validate` now
 * route through `services.licence`. Remaining stubs replace per phase:
 *   - Wk 4 → project:* (via DB, D18)
 *   - Wk 6 → project:create, project:open, project:close
 *   - Ph 2 → session:*, capture:*
 *   - Ph 3 → export:*, metrics:import, template:save
 *   - Ph 4 → signoff:submit
 */
export function registerAllHandlers(services: ServiceRegistry): void {
  const stub = async (): Promise<null> => null;

  registerHandler(IPC.SESSION_CREATE, SessionIntakeSchema, stub);
  registerHandler(IPC.SESSION_END, SessionEndSchema, stub);
  registerHandler(IPC.CAPTURE_SCREENSHOT, CaptureRequestSchema, stub);
  registerHandler(IPC.CAPTURE_ANNOTATE_SAVE, AnnotationSaveSchema, stub);
  registerHandler(IPC.CAPTURE_TAG_UPDATE, CaptureTagUpdateSchema, stub);
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

  // eslint-disable-next-line no-console
  console.info(`[ipc-router] ${Object.values(IPC).length} handlers registered (2 live, 15 stub)`);
}

/**
 * Throw helper for services — keeps call sites terse.
 *   throwEvidex('SESSION_NOT_FOUND', 'no active session');
 */
export function throwEvidex(code: EvidexErrorCode, message: string, fields?: Record<string, string>): never {
  throw new EvidexError(code, message, fields);
}
