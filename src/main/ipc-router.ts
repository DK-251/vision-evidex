import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import type { z } from 'zod';
import { IPC, type IpcChannel } from '@shared/ipc-channels';
import { EvidexError, isEvidexError } from '@shared/types/errors';
import { EvidexErrorCode, type IpcResult } from '@shared/types/ipc';

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
          error: { code: err.code, message: err.message, fields: err.fields },
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
 * Register all IPC handlers. Phase 0 stub — each channel is registered
 * in Phase 1–4 as its owning service lands. For now the router only
 * logs that it was wired so the app boots without handler warnings.
 */
export function registerAllHandlers(): void {
  // Phase 1 Week 4 → licence handlers
  // Phase 1 Week 6 → project handlers
  // Phase 2       → session, capture, annotation handlers
  // Phase 3       → export, metrics, template handlers
  // Phase 4       → signoff handler
  const channels = Object.values(IPC);
  // eslint-disable-next-line no-console
  console.info(`[ipc-router] ${channels.length} channels declared; handlers wired per phase.`);
}

/**
 * Throw helper for services — keeps call sites terse.
 *   throwEvidex('SESSION_NOT_FOUND', 'no active session');
 */
export function throwEvidex(code: EvidexErrorCode, message: string, fields?: Record<string, string>): never {
  throw new EvidexError(code, message, fields);
}
