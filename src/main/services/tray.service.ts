import type { Session } from '@shared/types/entities';

/**
 * TrayService — system tray icon + session status indicator.
 * Phase 2 Week 8 implementation.
 */
export class TrayService {
  create(): void {
    throw new Error('TrayService.create — Phase 2 Week 8');
  }

  updateStatus(_session: Session | null): void {
    throw new Error('TrayService.updateStatus — Phase 2 Week 8');
  }

  destroy(): void {
    throw new Error('TrayService.destroy — Phase 2 Week 8');
  }
}
