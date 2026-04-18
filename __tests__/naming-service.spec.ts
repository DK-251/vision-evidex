import { describe, it, expect } from 'vitest';
import {
  NamingService,
  DEFAULT_PATTERN,
  type NamingContext,
} from '../src/main/services/naming.service';

const FIXED_NOW = new Date('2026-04-18T09:05:07.123Z');

function svc() {
  return new NamingService({ now: () => FIXED_NOW });
}

function baseCtx(overrides: Partial<NamingContext> = {}): NamingContext {
  return {
    projectName: 'Vision Project',
    clientName: 'ACME Corp',
    testId: 'T-001',
    testerName: 'Deepak Sahu',
    environment: 'QA Sandbox',
    sequenceNum: 1,
    ...overrides,
  };
}

describe('NamingService', () => {
  describe('generate — tokens', () => {
    it('ProjectCode: spaces→hyphens, uppercase, max 8 chars', () => {
      const out = svc().generate(baseCtx({ pattern: '{ProjectCode}' }));
      expect(out).toBe('VISION-P.jpg');
    });

    it('ClientCode: same rules as ProjectCode', () => {
      expect(svc().generate(baseCtx({ pattern: '{ClientCode}' }))).toBe('ACME-COR.jpg');
    });

    it('TestID: verbatim', () => {
      expect(svc().generate(baseCtx({ pattern: '{TestID}' }))).toBe('T-001.jpg');
    });

    it('TesterInitials: first letter of each space-split word, uppercase', () => {
      expect(svc().generate(baseCtx({ pattern: '{TesterInitials}' }))).toBe('DS.jpg');
    });

    it('Date: UTC YYYY-MM-DD from now()', () => {
      expect(svc().generate(baseCtx({ pattern: '{Date}' }))).toBe('2026-04-18.jpg');
    });

    it('Time: UTC HH-MM-SS from now()', () => {
      expect(svc().generate(baseCtx({ pattern: '{Time}' }))).toBe('09-05-07.jpg');
    });

    it('Seq: zero-padded to 4 digits', () => {
      expect(svc().generate(baseCtx({ pattern: '{Seq}', sequenceNum: 42 }))).toBe('0042.jpg');
      expect(svc().generate(baseCtx({ pattern: '{Seq}', sequenceNum: 10000 }))).toBe('10000.jpg');
    });

    it('Status: upper-case status tag, defaults to UNTAGGED', () => {
      expect(svc().generate(baseCtx({ pattern: '{Status}' }))).toBe('UNTAGGED.jpg');
      expect(svc().generate(baseCtx({ pattern: '{Status}', statusTag: 'fail' }))).toBe('FAIL.jpg');
    });

    it('ModuleCode: default MOD when not provided, else upstream value', () => {
      expect(svc().generate(baseCtx({ pattern: '{ModuleCode}' }))).toBe('MOD.jpg');
      expect(
        svc().generate(baseCtx({ pattern: '{ModuleCode}', moduleCode: 'AUTH' }))
      ).toBe('AUTH.jpg');
    });

    it('Env: spaces→hyphens, uppercase, max 6 chars', () => {
      expect(svc().generate(baseCtx({ pattern: '{Env}' }))).toBe('QA-SAN.jpg');
    });
  });

  describe('generate — pattern behaviour', () => {
    it('DEFAULT_PATTERN renders full filename', () => {
      const out = svc().generate(baseCtx({ pattern: DEFAULT_PATTERN }));
      expect(out).toBe('VISION-P_T-001_2026-04-18_09-05-07_0001.jpg');
    });

    it('empty / whitespace pattern falls back to default', () => {
      expect(svc().generate(baseCtx({ pattern: '' }))).toBe(
        'VISION-P_T-001_2026-04-18_09-05-07_0001.jpg'
      );
      expect(svc().generate(baseCtx({ pattern: '   ' }))).toBe(
        'VISION-P_T-001_2026-04-18_09-05-07_0001.jpg'
      );
    });

    it('unknown tokens are left as-is (not an error)', () => {
      const out = svc().generate(baseCtx({ pattern: '{TestID}_{Nope}_{Seq}' }));
      expect(out).toBe('T-001_{Nope}_0001.jpg');
    });

    it('sanitises Windows-illegal characters', () => {
      // TestID containing every forbidden char is worst-case.
      const out = svc().generate(
        baseCtx({ pattern: '{TestID}', testId: 'A<B>C:D"E/F\\G|H?I*J' })
      );
      expect(out).toBe('A_B_C_D_E_F_G_H_I_J.jpg');
    });

    it('replaces literal whitespace in rendered output with underscore', () => {
      const out = svc().generate(baseCtx({ pattern: 'fixed name {TestID}' }));
      expect(out).toBe('fixed_name_T-001.jpg');
    });

    it('uses explicit capturedAt when provided', () => {
      const out = svc().generate(
        baseCtx({
          pattern: '{Date}_{Time}',
          capturedAt: '2025-12-31T23:59:59.000Z',
        })
      );
      expect(out).toBe('2025-12-31_23-59-59.jpg');
    });
  });

  describe('preview', () => {
    it('renders pattern using sample defaults when fields are missing', () => {
      // 'Sample Project' → dehyphen → 'Sample-Project' → slice(0,8) → 'Sample-P' → upper.
      const out = svc().preview('{ProjectCode}_{TestID}_{Seq}', {});
      expect(out).toBe('SAMPLE-P_T-001_0001.jpg');
    });

    it('honours partial overrides', () => {
      const out = svc().preview('{ClientCode}_{TesterInitials}', {
        clientName: 'Widget Co',
        testerName: 'A B',
      });
      expect(out).toBe('WIDGET-C_AB.jpg');
    });
  });

  describe('validate', () => {
    it('known tokens only → valid', () => {
      expect(svc().validate(DEFAULT_PATTERN)).toEqual({ valid: true, unknownTokens: [] });
    });

    it('unknown tokens → reported, deduplicated', () => {
      const r = svc().validate('{ProjectCode}_{Unknown}_{Seq}_{Unknown}_{Nope}');
      expect(r.valid).toBe(false);
      expect(r.unknownTokens.sort()).toEqual(['{Nope}', '{Unknown}']);
    });

    it('pattern with no tokens is trivially valid', () => {
      expect(svc().validate('just-a-string')).toEqual({ valid: true, unknownTokens: [] });
    });
  });
});
