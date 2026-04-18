import type { StatusTag } from '@shared/types/entities';

/**
 * NamingService — token substitution for capture filenames.
 *
 * Tokens (10 total, Tech Spec §13):
 *   {ProjectCode} {ClientCode} {ModuleCode}
 *   {TestID}      {TesterInitials}
 *   {Date}        {Time}        {Seq}
 *   {Status}      {Env}
 *
 * Unknown tokens are left as-is (not an error) so custom patterns can
 * carry literal braces. Windows-invalid characters are sanitised before
 * the ".jpg" extension is appended.
 *
 * Stateless — no DB access. Callers resolve the NamingContext from
 * their own data (project lookup, session fields, capture timestamp).
 */

export const DEFAULT_PATTERN = '{ProjectCode}_{TestID}_{Date}_{Time}_{Seq}';

export interface NamingContext {
  projectName: string;
  clientName: string;
  testId: string;
  testerName: string;
  environment: string;
  sequenceNum: number;
  statusTag?: StatusTag;
  moduleCode?: string;
  capturedAt?: string; // ISO-8601; defaults to now
  pattern?: string;    // defaults to DEFAULT_PATTERN
}

type TokenRenderer = (ctx: Required<Pick<NamingContext, 'sequenceNum'>> & NamingContext & {
  capturedAtDate: Date;
}) => string;

const TOKEN_MAP: Record<string, TokenRenderer> = {
  '{ProjectCode}': (c) => truncUpper(dehyphen(c.projectName), 8),
  '{ClientCode}': (c) => truncUpper(dehyphen(c.clientName), 8),
  '{TestID}': (c) => c.testId,
  '{TesterInitials}': (c) => initials(c.testerName),
  '{Date}': (c) => utcDate(c.capturedAtDate),
  '{Time}': (c) => utcTime(c.capturedAtDate),
  '{Seq}': (c) => String(c.sequenceNum).padStart(4, '0'),
  '{Status}': (c) => (c.statusTag ?? 'untagged').toUpperCase(),
  '{ModuleCode}': (c) => c.moduleCode ?? 'MOD',
  '{Env}': (c) => truncUpper(dehyphen(c.environment), 6),
};

export class NamingService {
  constructor(private readonly opts: { now?: () => Date } = {}) {}

  generate(ctx: NamingContext): string {
    const capturedAt = ctx.capturedAt ?? (this.opts.now ? this.opts.now() : new Date()).toISOString();
    const capturedAtDate = new Date(capturedAt);
    const pattern = ctx.pattern?.trim() || DEFAULT_PATTERN;
    const full = { ...ctx, capturedAt, capturedAtDate };
    const rendered = pattern.replace(/\{[A-Za-z]+\}/g, (token) => {
      const fn = TOKEN_MAP[token];
      return fn ? fn(full) : token;
    });
    return sanitiseFilename(rendered) + '.jpg';
  }

  preview(pattern: string, ctx: Partial<NamingContext>): string {
    const sample: NamingContext = {
      projectName: ctx.projectName ?? 'Sample Project',
      clientName: ctx.clientName ?? 'ACME Corp',
      testId: ctx.testId ?? 'T-001',
      testerName: ctx.testerName ?? 'Deepak Sahu',
      environment: ctx.environment ?? 'QA',
      sequenceNum: ctx.sequenceNum ?? 1,
      ...(ctx.statusTag !== undefined ? { statusTag: ctx.statusTag } : {}),
      ...(ctx.moduleCode !== undefined ? { moduleCode: ctx.moduleCode } : {}),
      ...(ctx.capturedAt !== undefined ? { capturedAt: ctx.capturedAt } : {}),
      pattern,
    };
    return this.generate(sample);
  }

  validate(pattern: string): { valid: boolean; unknownTokens: string[] } {
    const matches = pattern.match(/\{[A-Za-z]+\}/g) ?? [];
    const unknown = matches.filter((t) => !TOKEN_MAP[t]);
    return { valid: unknown.length === 0, unknownTokens: Array.from(new Set(unknown)) };
  }
}

// ─── helpers ────────────────────────────────────────────────────────────

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function utcDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function utcTime(d: Date): string {
  return `${pad2(d.getUTCHours())}-${pad2(d.getUTCMinutes())}-${pad2(d.getUTCSeconds())}`;
}

function dehyphen(s: string): string {
  return s.replace(/\s+/g, '-');
}

function truncUpper(s: string, max: number): string {
  return s.slice(0, max).toUpperCase();
}

function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

function sanitiseFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
}
