import { desktopCapturer, screen } from 'electron';
import sharp from 'sharp';
import type { CaptureMode, ScreenRegion } from '@shared/types/entities';
import { EvidexError } from '@shared/types/errors';
import { EvidexErrorCode } from '@shared/types/ipc';
import type { CaptureSource } from './capture.service';

/**
 * `desktopCapturer`-backed `CaptureSource`. Phase 2 Wk 7 D35 plumbing —
 * the real on-Asus verification of fullscreen/window/region pixel
 * fidelity is part of Wk 8 once Project-open lands and the full pipeline
 * can write to disk. Until then this adapter exists so the IPC + hotkey
 * paths can run end-to-end and fail at the container step (which is the
 * expected D35 behaviour while `containerId === 'NO_CONTAINER'`).
 *
 * Rule 7 is preserved: this adapter returns a single PNG buffer (cropped
 * for region mode). `CaptureService` SHA-256-hashes that buffer BEFORE
 * any sharp().jpeg() call, so the integrity chain still describes the
 * exact pixels that will be persisted.
 */
export const electronCaptureSource: CaptureSource = {
  async getRawScreen(mode: CaptureMode, region?: ScreenRegion): Promise<Buffer> {
    if (mode === 'region' && !region) {
      throw new EvidexError(
        EvidexErrorCode.CAPTURE_FAILED,
        'region mode requires a ScreenRegion'
      );
    }

    const display = screen.getPrimaryDisplay();
    const { width, height } = display.size;

    const sources = await desktopCapturer.getSources({
      types: mode === 'active-window' ? ['window'] : ['screen'],
      thumbnailSize: { width, height },
    });

    if (sources.length === 0) {
      throw new EvidexError(
        EvidexErrorCode.CAPTURE_FAILED,
        `desktopCapturer returned no ${mode} sources`
      );
    }

    const png = sources[0]!.thumbnail.toPNG();

    if (mode === 'region' && region) {
      // Crop here so the buffer CaptureService hashes matches what will
      // be persisted. Rule 7 says hash BEFORE jpeg compression — sharp
      // here is producing PNG (lossless), so the hash still describes
      // the exact pixels that go through `sharp().jpeg()` next.
      return sharp(png)
        .extract({
          left: region.x,
          top: region.y,
          width: region.width,
          height: region.height,
        })
        .png()
        .toBuffer();
    }

    return png;
  },
};
