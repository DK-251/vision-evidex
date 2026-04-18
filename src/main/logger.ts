import fs from 'node:fs';
import { getLogPath } from './app-paths';

/**
 * File-backed logger for the main process. One log file per UTC day,
 * appended to. Every line also mirrors to stdout/stderr in dev so the
 * electron-vite console shows activity.
 *
 * Redaction: anything whose key matches REDACT_KEYS is replaced with
 * `[REDACTED]` before the record is serialized. Covers licence keys,
 * tokens, passwords, API secrets, and crypto material — never rely on
 * caller discipline to keep these out of logs.
 */

type Level = 'info' | 'warn' | 'error';

const REDACT_KEYS = /^(licence(Key)?|token|password|secret|apiKey|sig|signature|privateKey|key)$/i;

function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value as object)) return '[Circular]';
  seen.add(value as object);
  if (Array.isArray(value)) return value.map((v) => redact(v, seen));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = REDACT_KEYS.test(k) ? '[REDACTED]' : redact(v, seen);
  }
  return out;
}

function serialize(level: Level, msg: string, meta?: Record<string, unknown>): string {
  const record = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(meta ? { meta: redact(meta) } : {}),
  };
  return JSON.stringify(record);
}

function write(level: Level, line: string): void {
  try {
    fs.appendFileSync(getLogPath(), line + '\n', { encoding: 'utf8' });
  } catch {
    // Fall through to console — logger must never throw into the app.
  }
  // eslint-disable-next-line no-console
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.info)(line);
}

export const logger = {
  info(msg: string, meta?: Record<string, unknown>): void {
    write('info', serialize('info', msg, meta));
  },
  warn(msg: string, meta?: Record<string, unknown>): void {
    write('warn', serialize('warn', msg, meta));
  },
  error(msg: string, meta?: Record<string, unknown>): void {
    write('error', serialize('error', msg, meta));
  },
};
