import type { Session } from '@shared/types/entities';

/**
 * NamingService — token substitution for capture filenames.
 *
 * Tokens:
 *   {ProjectCode}, {ClientCode}, {ModuleCode}, {TestID},
 *   {TesterInitials}, {Date}, {Time}, {Seq}, {Status}, {Env}
 *
 * Windows filename sanitisation: strip  < > : " / \ | ? *  and replace
 * spaces with underscores.
 *
 * Phase 1 Week 4 implementation.
 */
export class NamingService {
  generate(_session: Session, _sequenceNum: number): string {
    throw new Error('NamingService.generate — Phase 1 Week 4');
  }

  preview(_pattern: string, _sampleSession: Partial<Session>): string {
    throw new Error('NamingService.preview — Phase 1 Week 4');
  }

  validate(_pattern: string): { valid: boolean; unknownTokens: string[] } {
    throw new Error('NamingService.validate — Phase 1 Week 4');
  }
}
