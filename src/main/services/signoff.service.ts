import type { SignOff, SignOffSubmitInput } from '@shared/types/entities';

/**
 * SignOffService — write-once sign-off records inside .evidex.
 * Phase 4 implementation. Enforces AU-02 rules: name, role, date/time,
 * decision required; comments required when decision='reject'.
 */
export class SignOffService {
  async submit(_request: SignOffSubmitInput): Promise<SignOff> {
    throw new Error('SignOffService.submit — Phase 4');
  }

  getAll(_projectId: string): SignOff[] {
    throw new Error('SignOffService.getAll — Phase 4');
  }
}
