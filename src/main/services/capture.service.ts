import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { ulid } from 'ulid';
import type {
  Capture,
  CaptureMode,
  CaptureRequestInput,
  CaptureResult,
  ManifestEntry,
  ScreenRegion,
  StatusTag,
} from '@shared/types/entities';
import type { DatabaseService } from './database.service';
import type { EvidexContainerService } from './evidex-container.service';
import { NamingService, type NamingContext } from './naming.service';

/**
 * CaptureService — Phase 2 Week 7 / D32.
 *
 * Implements the 9-step capture pipeline from Tech Spec §9.2. The step
 * order is load-bearing — Architectural Rule 7 requires the SHA-256
 * hash to be computed over the ORIGINAL raw framebuffer BEFORE any
 * JPEG compression. Any reordering invalidates the integrity chain.
 *
 * Dependencies are passed through the constructor so tests can swap
 * the capture source (the only non-portable part — `desktopCapturer`
 * is main-process-only) and drive the pipeline end-to-end in Node.
 */

export interface CaptureSource {
  /**
   * Produce a raw uncompressed framebuffer for the requested mode.
   * The real implementation wraps Electron's `desktopCapturer`; the
   * test implementation returns a known Buffer so SHA-256 can be
   * asserted against a deterministic value.
   */
  getRawScreen(mode: CaptureMode, region?: ScreenRegion): Promise<Buffer>;
}

export interface CaptureSessionContext {
  sessionId: string;
  projectId: string;
  containerId: string;
  testerName: string;
  projectName: string;
  clientName: string;
  testId: string;
  environment: string;
  namingPattern?: string;
  /** Next sequence number for this session — service pre-computes it. */
  nextSequenceNum: number;
}

export interface SessionLookup {
  getSessionContext(sessionId: string): Promise<CaptureSessionContext>;
}

export interface RuntimeInfo {
  machineName: string;
  osVersion: string;
  appVersion: string;
}

export interface CaptureServiceDeps {
  source:   CaptureSource;
  sessions: SessionLookup;
  container: EvidexContainerService;
  db:       DatabaseService;
  naming:   NamingService;
  runtime:  RuntimeInfo;
  /** Broadcast the `capture:flash` event to the toolbar renderer. */
  onFlash?: () => void;
  /** Override clock for deterministic tests. */
  now?: () => Date;
}

export class CaptureService {
  constructor(private readonly deps: CaptureServiceDeps) {}

  async screenshot(input: CaptureRequestInput): Promise<CaptureResult> {
    const capturedAt = (this.deps.now ? this.deps.now() : new Date()).toISOString();

    // Step 1–2: acquire the raw framebuffer.
    const rawBuffer = await this.deps.source.getRawScreen(input.mode, input.region);

    // Step 3: INTEGRITY POINT — hash the untouched framebuffer.
    // If this runs AFTER any sharp() call, the manifest chain is wrong.
    const sha256Hash = createHash('sha256').update(rawBuffer).digest('hex');

    // Step 4: primary JPEG @ quality 85.
    const compressed = await sharp(rawBuffer).jpeg({ quality: 85 }).toBuffer();
    // Step 5: 160×90 thumbnail @ quality 70.
    const thumbnailBuf = await sharp(rawBuffer)
      .resize(160, 90)
      .jpeg({ quality: 70 })
      .toBuffer();

    // Step 6: resolve naming context + generate filename.
    const ctx = await this.deps.sessions.getSessionContext(input.sessionId);
    const namingCtx: NamingContext = {
      projectName:  ctx.projectName,
      clientName:   ctx.clientName,
      testId:       ctx.testId,
      testerName:   ctx.testerName,
      environment:  ctx.environment,
      sequenceNum:  ctx.nextSequenceNum,
      capturedAt,
      ...(input.statusTag !== undefined ? { statusTag: input.statusTag } : {}),
      ...(ctx.namingPattern !== undefined ? { pattern: ctx.namingPattern } : {}),
    };
    const filename = this.deps.naming.generate(namingCtx);

    // Step 7: write the compressed image into the .evidex container.
    await this.deps.container.addImage(ctx.containerId, filename, compressed, 'original');

    // Step 8: persist to app.db + manifest (logical transaction).
    const captureId = `cap_${ulid()}`;
    const statusTag: StatusTag = input.statusTag ?? 'untagged';

    const captureRow: Capture = {
      id:              captureId,
      sessionId:       input.sessionId,
      projectId:       ctx.projectId,
      sequenceNum:     ctx.nextSequenceNum,
      originalFilename: filename,
      sha256Hash,
      fileSizeBytes:   compressed.byteLength,
      captureMode:     input.mode,
      statusTag,
      capturedAt,
      machineName:     this.deps.runtime.machineName,
      osVersion:       this.deps.runtime.osVersion,
      appVersion:      this.deps.runtime.appVersion,
      testerName:      ctx.testerName,
    };
    this.deps.db.insertCapture(captureRow);

    const manifestEntry: ManifestEntry = {
      captureId,
      originalFilename: filename,
      sha256Hash,
      fileSizeBytes:   compressed.byteLength,
      capturedAt,
      sequenceNum:     ctx.nextSequenceNum,
    };
    await this.deps.container.appendManifest(ctx.containerId, manifestEntry);

    // Step 9: fire the flash event (swallowed if no listener).
    this.deps.onFlash?.();

    return {
      captureId,
      filename,
      sha256Hash,
      fileSizeBytes: compressed.byteLength,
      thumbnail:     `data:image/jpeg;base64,${thumbnailBuf.toString('base64')}`,
      capturedAt,
    };
  }
}
