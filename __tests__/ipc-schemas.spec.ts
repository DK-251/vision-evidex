// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { z } from 'zod';
import {
  SessionIntakeSchema,
  SessionEndSchema,
  SessionGetSchema,
  CaptureRequestSchema,
  CaptureTagUpdateSchema,
  ProjectCreateSchema,
  SignOffSubmitSchema,
  ImportedMetricsSchema,
  LicenceActivateSchema,
} from '@shared/schemas/index';

/**
 * Pure Zod parse coverage for every IPC payload schema. Sister file to
 * `ipc-router.spec.ts` (which tests the dispatch wrapper); this file
 * tests the schemas in isolation so a future refactor of the router
 * can't mask schema regressions.
 */

function rejects(schema: z.ZodTypeAny, input: unknown): boolean {
  return !schema.safeParse(input).success;
}

const validIntake = (): z.infer<typeof SessionIntakeSchema> => ({
  projectId:            'proj_01TEST',
  testId:               'TC-001',
  testName:             'Login flow',
  scenario:             'User logs in with valid credentials',
  applicationUnderTest: 'MyApp v1.0',
  testerName:           'Jane Smith',
  testerEmail:          'jane@test.com',
  environment:          'QA-ENV-01',
});

describe('IPC Schema Validation', () => {

  describe('SessionIntakeSchema', () => {
    it('accepts a fully populated valid payload', () => {
      expect(SessionIntakeSchema.safeParse(validIntake()).success).toBe(true);
    });
    it('rejects when testId is missing', () => {
      const v = validIntake() as Record<string, unknown>;
      delete v['testId'];
      expect(rejects(SessionIntakeSchema, v)).toBe(true);
    });
    it('rejects when testName is missing', () => {
      const v = validIntake() as Record<string, unknown>;
      delete v['testName'];
      expect(rejects(SessionIntakeSchema, v)).toBe(true);
    });
    it('rejects when applicationUnderTest is missing', () => {
      const v = validIntake() as Record<string, unknown>;
      delete v['applicationUnderTest'];
      expect(rejects(SessionIntakeSchema, v)).toBe(true);
    });
    it('rejects when environment is missing', () => {
      const v = validIntake() as Record<string, unknown>;
      delete v['environment'];
      expect(rejects(SessionIntakeSchema, v)).toBe(true);
    });
    it('rejects when testerEmail is not a valid email', () => {
      expect(rejects(SessionIntakeSchema, { ...validIntake(), testerEmail: 'not-an-email' })).toBe(true);
    });
    it('accepts payload with optional fields omitted', () => {
      // testDataMatrix, scenario, requirementId, requirementDesc, testerEmail are optional
      const minimal = {
        projectId: 'proj_01TEST', testId: 'TC-001', testName: 'Login',
        environment: 'QA', testerName: 'Jane', applicationUnderTest: 'MyApp',
      };
      expect(SessionIntakeSchema.safeParse(minimal).success).toBe(true);
    });
    it('rejects testId longer than 100 characters', () => {
      expect(rejects(SessionIntakeSchema, { ...validIntake(), testId: 'A'.repeat(101) })).toBe(true);
    });
  });

  describe('SessionEndSchema', () => {
    it('accepts a sessionId string', () => {
      expect(SessionEndSchema.safeParse({ sessionId: 'sess_01TEST' }).success).toBe(true);
    });
    it('rejects empty object', () => {
      expect(rejects(SessionEndSchema, {})).toBe(true);
    });
    it('rejects when sessionId is not a string', () => {
      expect(rejects(SessionEndSchema, { sessionId: 42 })).toBe(true);
    });
    it('rejects empty-string sessionId', () => {
      expect(rejects(SessionEndSchema, { sessionId: '' })).toBe(true);
    });
  });

  describe('SessionGetSchema', () => {
    it('accepts a sessionId string', () => {
      expect(SessionGetSchema.safeParse({ sessionId: 'sess_01TEST' }).success).toBe(true);
    });
    it('rejects empty object', () => {
      expect(rejects(SessionGetSchema, {})).toBe(true);
    });
  });

  describe('CaptureRequestSchema', () => {
    it('accepts mode:fullscreen without region', () => {
      expect(CaptureRequestSchema.safeParse({ sessionId: 'sess_01TEST', mode: 'fullscreen' }).success).toBe(true);
    });
    it('accepts mode:active-window without region', () => {
      expect(CaptureRequestSchema.safeParse({ sessionId: 'sess_01TEST', mode: 'active-window' }).success).toBe(true);
    });
    it('accepts mode:region with a valid ScreenRegion', () => {
      expect(CaptureRequestSchema.safeParse({
        sessionId: 'sess_01TEST', mode: 'region',
        region: { x: 0, y: 0, width: 800, height: 600 },
      }).success).toBe(true);
    });
    it('rejects mode:region without a region field — schema-level refine()', () => {
      expect(rejects(CaptureRequestSchema, { sessionId: 'sess_01TEST', mode: 'region' })).toBe(true);
    });
    it('defaults statusTag to "untagged" when omitted', () => {
      const result = CaptureRequestSchema.safeParse({ sessionId: 'sess_01TEST', mode: 'fullscreen' });
      expect(result.success && result.data.statusTag).toBe('untagged');
    });
    it('rejects unknown mode value', () => {
      expect(rejects(CaptureRequestSchema, { sessionId: 'sess_01TEST', mode: 'window' })).toBe(true);
    });
    it('rejects region with non-positive width', () => {
      expect(rejects(CaptureRequestSchema, {
        sessionId: 'sess_01TEST', mode: 'region',
        region: { x: 0, y: 0, width: 0, height: 600 },
      })).toBe(true);
    });
    it('rejects region with non-positive height', () => {
      expect(rejects(CaptureRequestSchema, {
        sessionId: 'sess_01TEST', mode: 'region',
        region: { x: 0, y: 0, width: 800, height: -1 },
      })).toBe(true);
    });
  });

  describe('CaptureTagUpdateSchema', () => {
    const tags = ['pass', 'fail', 'blocked', 'skip', 'untagged'] as const;
    tags.forEach((tag) => {
      it(`accepts tag value: ${tag}`, () => {
        expect(CaptureTagUpdateSchema.safeParse({ captureId: 'cap_01', tag }).success).toBe(true);
      });
    });
    it('rejects unknown tag value', () => {
      expect(rejects(CaptureTagUpdateSchema, { captureId: 'cap_01', tag: 'maybe' })).toBe(true);
    });
    it('rejects empty-string captureId', () => {
      expect(rejects(CaptureTagUpdateSchema, { captureId: '', tag: 'pass' })).toBe(true);
    });
  });

  describe('ProjectCreateSchema', () => {
    const validProject = () => ({
      name:              'Alpha Release',
      clientName:        'Acme Corp',
      startDate:         '2025-01-15',
      templateId:        'tpl-tsr',
      brandingProfileId: 'brand-001',
      storagePath:       'C:\\Users\\test\\Documents\\VisionEviDex',
    });
    it('accepts a fully populated valid payload', () => {
      expect(ProjectCreateSchema.safeParse(validProject()).success).toBe(true);
    });
    it('rejects when name is empty string', () => {
      expect(rejects(ProjectCreateSchema, { ...validProject(), name: '' })).toBe(true);
    });
    it('rejects when clientName is empty string', () => {
      expect(rejects(ProjectCreateSchema, { ...validProject(), clientName: '' })).toBe(true);
    });
    it('rejects when startDate is not YYYY-MM-DD', () => {
      expect(rejects(ProjectCreateSchema, { ...validProject(), startDate: '15/01/2025' })).toBe(true);
    });
    it('rejects name longer than 100 characters', () => {
      expect(rejects(ProjectCreateSchema, { ...validProject(), name: 'A'.repeat(101) })).toBe(true);
    });
    it('defaults namingPattern when omitted', () => {
      const result = ProjectCreateSchema.safeParse(validProject());
      expect(result.success && typeof result.data.namingPattern).toBe('string');
      expect(result.success && result.data.namingPattern.length).toBeGreaterThan(0);
    });
  });

  describe('SignOffSubmitSchema', () => {
    const baseReviewer = {
      projectId: 'proj_01TEST', reviewerName: 'John Doe', reviewerRole: 'QA Lead',
    };
    it('accepts decision:accept without comments', () => {
      expect(SignOffSubmitSchema.safeParse({ ...baseReviewer, decision: 'accept' }).success).toBe(true);
    });
    it('accepts decision:accept_with_comments with comments', () => {
      expect(SignOffSubmitSchema.safeParse({
        ...baseReviewer, decision: 'accept_with_comments', comments: 'Minor issues noted',
      }).success).toBe(true);
    });
    it('accepts decision:reject with non-empty comments', () => {
      expect(SignOffSubmitSchema.safeParse({
        ...baseReviewer, decision: 'reject', comments: 'Defects unresolved',
      }).success).toBe(true);
    });
    it('rejects decision:reject without comments — refine() rule', () => {
      expect(rejects(SignOffSubmitSchema, { ...baseReviewer, decision: 'reject' })).toBe(true);
    });
    it('rejects decision:reject with whitespace-only comments — refine() rule', () => {
      expect(rejects(SignOffSubmitSchema, {
        ...baseReviewer, decision: 'reject', comments: '   ',
      })).toBe(true);
    });
    it('rejects unknown decision value', () => {
      expect(rejects(SignOffSubmitSchema, { ...baseReviewer, decision: 'maybe' })).toBe(true);
    });
  });

  describe('ImportedMetricsSchema', () => {
    const validMetrics = () => ({
      template_version: 'evidex-import-v1',
      report_type: 'TSR' as const,
      project_name: 'Alpha',
      reporting_period_start: '2025-01-01',
      reporting_period_end: '2025-01-31',
      total_test_cases: 100, executed: 90, passed: 80, failed: 8,
      blocked: 2, not_run: 10, pass_rate_pct: 88.9,
      defects_raised: 10, defects_closed: 8, defects_open: 2,
      critical_defects: 1, coverage_pct: 92.5,
      environment: 'QA-ENV-01', notes: null,
    });
    it('accepts all-integer numeric fields', () => {
      expect(ImportedMetricsSchema.safeParse(validMetrics()).success).toBe(true);
    });
    it('coerces string-encoded integers (LibreOffice compatibility)', () => {
      const result = ImportedMetricsSchema.safeParse({
        ...validMetrics(), total_test_cases: '100', executed: '90',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total_test_cases).toBe(100);
        expect(typeof result.data.total_test_cases).toBe('number');
      }
    });
    it('coerces string-encoded decimal for pass_rate_pct', () => {
      const result = ImportedMetricsSchema.safeParse({ ...validMetrics(), pass_rate_pct: '88.9' });
      expect(result.success && result.data.pass_rate_pct).toBeCloseTo(88.9);
    });
    it('rejects pass_rate_pct greater than 100', () => {
      expect(rejects(ImportedMetricsSchema, { ...validMetrics(), pass_rate_pct: 101 })).toBe(true);
    });
    it('rejects negative value for total_test_cases', () => {
      expect(rejects(ImportedMetricsSchema, { ...validMetrics(), total_test_cases: -1 })).toBe(true);
    });
  });

  describe('LicenceActivateSchema', () => {
    it('accepts a non-empty licenceKey', () => {
      expect(LicenceActivateSchema.safeParse({ licenceKey: 'ABCD-EFGH-IJKL-MNOP' }).success).toBe(true);
    });
    it('rejects empty licenceKey', () => {
      expect(rejects(LicenceActivateSchema, { licenceKey: '' })).toBe(true);
    });
  });
});
