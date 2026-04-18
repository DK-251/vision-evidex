import { EvidexErrorCode } from './ipc';

/**
 * Service-layer error. Caught at the IPC router boundary and serialised
 * into IpcResult<T>. Setting `.name` explicitly ensures instanceof works
 * across module boundaries.
 */
export class EvidexError extends Error {
  public readonly code: EvidexErrorCode;
  public readonly fields?: Record<string, string>;

  constructor(code: EvidexErrorCode, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'EvidexError';
    this.code = code;
    if (fields !== undefined) this.fields = fields;
    Object.setPrototypeOf(this, EvidexError.prototype);
  }
}

export function isEvidexError(err: unknown): err is EvidexError {
  return err instanceof Error && err.name === 'EvidexError';
}
