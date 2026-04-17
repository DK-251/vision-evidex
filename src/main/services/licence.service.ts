import type {
  ActivationResult,
  LicenceActivateInput,
  LicenceInfo,
  LicenceValidationResult,
} from '@shared/types/entities';

/**
 * LicenceService — Keygen.sh activation + local validation.
 *
 * Locked decision: `EVIDEX_LICENCE_MODE` is a build-time constant read from
 * process.env. In `none` mode every method is a no-op returning success.
 * In `keygen` mode the real Keygen.sh flow runs, but for all of Phase 0
 * and Phase 1 we short-circuit to `{ valid: true }` unconditionally —
 * the real network path is wired only in Phase 1 Week 4 when the
 * Keygen.sh account exists.
 *
 * `licence.sig` format: plain UTF-8 text file containing the JWT-style
 * token returned by Keygen.sh activation (base64url payload + RSA sig).
 * Read with fs.readFileSync(path, 'utf-8'). Never created in `none` mode.
 */

const LICENCE_MODE = (process.env['EVIDEX_LICENCE_MODE'] ?? 'none') as 'keygen' | 'none';

// Phase 0-1 short-circuit: always return valid regardless of mode.
const PHASE_0_1_STUB = true;

export class LicenceService {
  async activate(_request: LicenceActivateInput): Promise<ActivationResult> {
    if (LICENCE_MODE === 'none' || PHASE_0_1_STUB) {
      return {
        success: true,
        licenceInfo: {
          licenceKey: 'stub',
          status: 'active',
          activatedAt: new Date().toISOString(),
          machineFingerprint: 'stub',
        },
      };
    }
    throw new Error('LicenceService.activate real path — Phase 1 Week 4');
  }

  validate(): LicenceValidationResult {
    if (LICENCE_MODE === 'none' || PHASE_0_1_STUB) {
      return { valid: true };
    }
    throw new Error('LicenceService.validate real path — Phase 1 Week 4');
  }

  getLicenceInfo(): LicenceInfo | null {
    return null;
  }

  async deactivate(): Promise<void> {
    // no-op in both modes during Phase 0-1
  }

  getMode(): 'keygen' | 'none' {
    return LICENCE_MODE;
  }
}
