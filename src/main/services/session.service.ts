import type { Session, SessionIntakeInput, SessionSummary } from '@shared/types/entities';

/**
 * SessionService — session lifecycle. Enforces single-active-session-per-project.
 * Phase 2 Week 7 implementation.
 */
export class SessionService {
  async create(_intake: SessionIntakeInput): Promise<Session> {
    throw new Error('SessionService.create not implemented — Phase 2 Week 7');
  }

  async end(_sessionId: string): Promise<SessionSummary> {
    throw new Error('SessionService.end not implemented — Phase 2 Week 7');
  }

  getActive(_projectId: string): Session | null {
    throw new Error('SessionService.getActive not implemented — Phase 2 Week 7');
  }

  getAll(_projectId: string): Session[] {
    throw new Error('SessionService.getAll not implemented — Phase 2 Week 7');
  }

  get(_sessionId: string): Session | null {
    throw new Error('SessionService.get not implemented — Phase 2 Week 7');
  }

  hasActiveSession(): boolean {
    return false;
  }
}
