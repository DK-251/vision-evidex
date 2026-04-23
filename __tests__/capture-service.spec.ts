import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import type {
  Capture,
  CaptureRequestInput,
  ManifestEntry,
} from '@shared/types/entities';
import {
  CaptureService,
  type CaptureSessionContext,
  type CaptureServiceDeps,
  type CaptureSource,
  type SessionLookup,
} from '../src/main/services/capture.service';
import { NamingService } from '../src/main/services/naming.service';

/**
 * Phase 2 Week 7 / D32. The 9-step capture pipeline has one load-bearing
 * invariant from Architectural Rule 7: SHA-256 must be computed on the
 * untouched raw framebuffer BEFORE any JPEG compression. If a future
 * refactor moves `sharp()` ahead of `createHash().update()`, the hash
 * stops describing the original pixels and the .evidex integrity chain
 * silently breaks. These tests lock that ordering down.
 */

const RAW_BYTES = 320 * 200 * 4; // 320×200 RGBA — small enough for fast tests

async function makeRawBuffer(): Promise<Buffer> {
  // A real framebuffer would be uncompressed pixels; use a raw RGBA
  // blob so sharp can actually process it without complaining about
  // missing dimensions.
  return sharp({
    create: { width: 320, height: 200, channels: 4, background: { r: 10, g: 40, b: 120, alpha: 1 } },
  })
    .raw()
    .toBuffer();
}

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

describe('CaptureService — 9-step pipeline (Phase 2 Wk7 / D32)', () => {
  const FIXED_NOW = new Date('2026-04-24T10:00:00Z');

  let raw: Buffer;
  let rawHash: string;
  let source: CaptureSource;
  let sessions: SessionLookup;
  let containerMock: {
    addImage: ReturnType<typeof vi.fn>;
    appendManifest: ReturnType<typeof vi.fn>;
  };
  let dbMock: { insertCapture: ReturnType<typeof vi.fn> };
  let onFlash: ReturnType<typeof vi.fn>;
  let deps: CaptureServiceDeps;
  let service: CaptureService;

  const sessionCtx: CaptureSessionContext = {
    sessionId:       'sess_1',
    projectId:       'proj_1',
    containerId:     'container_1',
    testerName:      'Deepak Sahu',
    projectName:     'Evidence QA',
    clientName:      'ACME',
    testId:          'T-001',
    environment:     'UAT',
    nextSequenceNum: 1,
  };

  const request: CaptureRequestInput = {
    sessionId: 'sess_1',
    mode:      'fullscreen',
    statusTag: 'untagged',
  };

  beforeEach(async () => {
    raw = await makeRawBuffer();
    rawHash = sha256(raw);

    source = {
      getRawScreen: vi.fn().mockImplementation(async () => raw),
    };

    sessions = {
      getSessionContext: vi.fn().mockResolvedValue({ ...sessionCtx }),
    };

    containerMock = {
      addImage:       vi.fn().mockResolvedValue('images/original/stub.jpg'),
      appendManifest: vi.fn().mockResolvedValue(undefined),
    };

    dbMock = { insertCapture: vi.fn() };
    onFlash = vi.fn();

    deps = {
      source,
      sessions,
      container: containerMock as unknown as CaptureServiceDeps['container'],
      db:        dbMock as unknown as CaptureServiceDeps['db'],
      naming:    new NamingService({ now: () => FIXED_NOW }),
      runtime:   { machineName: 'TEST-PC', osVersion: 'Windows 11', appVersion: '1.0.0-test' },
      onFlash,
      now:       () => FIXED_NOW,
    };

    service = new CaptureService(deps);
  });

  it('returns a CaptureResult whose sha256 matches the RAW buffer (hash BEFORE compression)', async () => {
    const result = await service.screenshot(request);

    // The hash MUST be computed over the raw framebuffer. If a refactor
    // moved sharp().jpeg() ahead of createHash(), this hash would be of
    // the compressed bytes and wouldn't equal rawHash.
    expect(result.sha256Hash).toBe(rawHash);
    expect(source.getRawScreen).toHaveBeenCalledWith('fullscreen', undefined);
  });

  it('returns fileSizeBytes that is smaller than the raw framebuffer (compression ran)', async () => {
    const result = await service.screenshot(request);
    expect(result.fileSizeBytes).toBeLessThan(raw.byteLength);
    expect(result.fileSizeBytes).toBeGreaterThan(0);
  });

  it('emits a base64 JPEG thumbnail data URL', async () => {
    const result = await service.screenshot(request);
    expect(result.thumbnail.startsWith('data:image/jpeg;base64,')).toBe(true);
    // Decode and check the JPEG magic bytes (FF D8 FF).
    const b64 = result.thumbnail.slice('data:image/jpeg;base64,'.length);
    const bytes = Buffer.from(b64, 'base64');
    expect(bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))).toBe(true);
  });

  it('inserts a capture row whose sha256 matches the manifest entry', async () => {
    const result = await service.screenshot(request);

    expect(dbMock.insertCapture).toHaveBeenCalledTimes(1);
    const row = dbMock.insertCapture.mock.calls[0]![0] as Capture;
    expect(row.id).toBe(result.captureId);
    expect(row.sha256Hash).toBe(rawHash);
    expect(row.sequenceNum).toBe(1);
    expect(row.captureMode).toBe('fullscreen');
    expect(row.statusTag).toBe('untagged');
    expect(row.testerName).toBe('Deepak Sahu');
    expect(row.projectId).toBe('proj_1');
    expect(row.sessionId).toBe('sess_1');
    expect(row.machineName).toBe('TEST-PC');

    expect(containerMock.appendManifest).toHaveBeenCalledTimes(1);
    const entry = containerMock.appendManifest.mock.calls[0]![1] as ManifestEntry;
    expect(entry.captureId).toBe(result.captureId);
    expect(entry.sha256Hash).toBe(rawHash);
    expect(entry.sequenceNum).toBe(1);
    expect(entry.originalFilename).toBe(row.originalFilename);
  });

  it('writes the compressed image into the container BEFORE appending the manifest (persist-then-manifest)', async () => {
    await service.screenshot(request);

    const addOrder       = containerMock.addImage.mock.invocationCallOrder[0]!;
    const insertOrder    = dbMock.insertCapture.mock.invocationCallOrder[0]!;
    const manifestOrder  = containerMock.appendManifest.mock.invocationCallOrder[0]!;

    expect(addOrder).toBeLessThan(insertOrder);
    expect(insertOrder).toBeLessThan(manifestOrder);
  });

  it('fires onFlash AFTER persistence (step 9 runs last)', async () => {
    await service.screenshot(request);

    expect(onFlash).toHaveBeenCalledTimes(1);
    const flashOrder    = onFlash.mock.invocationCallOrder[0]!;
    const manifestOrder = containerMock.appendManifest.mock.invocationCallOrder[0]!;
    expect(flashOrder).toBeGreaterThan(manifestOrder);
  });

  it('defaults statusTag to "untagged" when input omits it', async () => {
    const req: CaptureRequestInput = { sessionId: 'sess_1', mode: 'fullscreen' };
    await service.screenshot(req);

    const row = dbMock.insertCapture.mock.calls[0]![0] as Capture;
    expect(row.statusTag).toBe('untagged');
  });

  it('respects an explicit statusTag from input', async () => {
    await service.screenshot({ ...request, statusTag: 'pass' });
    const row = dbMock.insertCapture.mock.calls[0]![0] as Capture;
    expect(row.statusTag).toBe('pass');
  });

  it('passes the region through to the capture source for region mode', async () => {
    const region = { x: 10, y: 20, width: 200, height: 120 };
    await service.screenshot({ sessionId: 'sess_1', mode: 'region', region });

    expect(source.getRawScreen).toHaveBeenCalledWith('region', region);
  });

  it('generates a deterministic filename from the session naming context', async () => {
    const result = await service.screenshot(request);
    // Default pattern: {ProjectCode}_{TestID}_{Date}_{Time}_{Seq}
    // projectName='Evidence QA' → 'EVIDENCE' (truncUpper to 8, spaces→hyphen→stripped), testId='T-001'.
    expect(result.filename).toMatch(/EVIDENCE_T-001_2026-04-24_10-00-00_0001\.jpg/);
  });
});
