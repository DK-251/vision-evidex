import fs from 'node:fs';
import path from 'node:path';
import type {
  ActivationResult,
  LicenceActivateInput,
  LicenceInfo,
  LicenceValidationResult,
} from '@shared/types/entities';
import { getMachineFingerprint } from './machine-fingerprint';
import { parseToken, verifyToken, isExpired } from './licence-token';

/**
 * LicenceService — Keygen.sh activation + local validation.
 *
 * Two modes, selected at construction time:
 *   - `none`   → no-op, every call returns success; licence.sig never
 *                created. Phase 0–1 default and `dist:enterprise` mode.
 *   - `keygen` → real path: activate via Keygen.sh REST, persist the
 *                returned JWT-style token to `licence.sig`, verify the
 *                Ed25519 signature + machine fingerprint binding +
 *                expiration on every launch.
 *
 * Dev bypass: when `isDev === true` (non-packaged build), `validate()`
 * short-circuits to `{ valid: true }` so local dev does not require
 * a real Keygen account. `activate()` still runs its real path so
 * contributors can exercise it when they have credentials.
 */

export interface LicenceServiceConfig {
  mode: 'keygen' | 'none';
  licenceFilePath: string;
  publicKeyPem?: string;
  keygenAccountId?: string;
  isDev?: boolean;
  now?: () => Date; // injectable for tests
}

const KEYGEN_API = 'https://api.keygen.sh/v1';

export class LicenceService {
  private cachedInfo: LicenceInfo | null = null;

  constructor(private readonly config: LicenceServiceConfig) {}

  getMode(): 'keygen' | 'none' {
    return this.config.mode;
  }

  validate(): LicenceValidationResult {
    const mode = this.config.mode;
    if (mode === 'none') return { valid: true, mode };
    if (this.config.isDev) return { valid: true, mode };

    if (!fs.existsSync(this.config.licenceFilePath)) {
      return { valid: false, reason: 'no licence file present', mode };
    }
    if (!this.config.publicKeyPem) {
      return { valid: false, reason: 'server public key not configured', mode };
    }

    const raw = fs.readFileSync(this.config.licenceFilePath, 'utf8');
    if (!verifyToken(raw, this.config.publicKeyPem)) {
      return { valid: false, reason: 'signature verification failed', mode };
    }

    const payload = parseToken(raw);
    if (!payload) {
      return { valid: false, reason: 'licence token malformed', mode };
    }

    const now = this.config.now ? this.config.now() : new Date();
    if (isExpired(payload, now)) {
      return { valid: false, reason: 'licence expired', mode };
    }

    const fingerprint = getMachineFingerprint();
    if (payload.fingerprint !== fingerprint) {
      return { valid: false, reason: 'machine fingerprint mismatch', mode };
    }

    this.cachedInfo = {
      licenceKey: payload.key,
      status: 'active',
      activatedAt: payload.activatedAt,
      machineFingerprint: fingerprint,
      ...(payload.expiresAt ? { expiresAt: payload.expiresAt } : {}),
    };
    return { valid: true, mode };
  }

  async activate(request: LicenceActivateInput): Promise<ActivationResult> {
    if (this.config.mode === 'none') {
      return { success: true };
    }
    if (!this.config.keygenAccountId) {
      return { success: false, reason: 'keygen account id not configured' };
    }

    const fingerprint = getMachineFingerprint();
    const url =
      `${KEYGEN_API}/accounts/${this.config.keygenAccountId}` +
      `/licenses/${encodeURIComponent(request.licenceKey)}/actions/validate-key`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.api+json',
          Accept: 'application/vnd.api+json',
        },
        body: JSON.stringify({ meta: { scope: { fingerprint } } }),
      });
    } catch (err) {
      return { success: false, reason: `network error: ${String(err)}` };
    }

    if (!response.ok) {
      return { success: false, reason: `keygen http ${response.status}` };
    }

    const data = (await response.json()) as {
      meta?: { valid?: boolean; code?: string };
      data?: { attributes?: { expiry?: string | null } };
      signedKey?: string;
    };
    if (!data.meta?.valid) {
      return { success: false, reason: `keygen rejected: ${data.meta?.code ?? 'unknown'}` };
    }
    if (!data.signedKey) {
      return { success: false, reason: 'keygen response missing signed token' };
    }

    // Verify before persisting — reject malformed responses.
    if (this.config.publicKeyPem && !verifyToken(data.signedKey, this.config.publicKeyPem)) {
      return { success: false, reason: 'returned token failed signature verification' };
    }

    this.atomicWrite(data.signedKey);

    const now = this.config.now ? this.config.now() : new Date();
    const licenceInfo: LicenceInfo = {
      licenceKey: request.licenceKey,
      status: 'active',
      activatedAt: now.toISOString(),
      machineFingerprint: fingerprint,
      ...(data.data?.attributes?.expiry ? { expiresAt: data.data.attributes.expiry } : {}),
    };
    this.cachedInfo = licenceInfo;
    return { success: true, licenceInfo };
  }

  getLicenceInfo(): LicenceInfo | null {
    return this.cachedInfo ? { ...this.cachedInfo } : null;
  }

  async deactivate(): Promise<void> {
    if (this.config.mode === 'none') return;
    if (fs.existsSync(this.config.licenceFilePath)) {
      fs.unlinkSync(this.config.licenceFilePath);
    }
    this.cachedInfo = null;
  }

  private atomicWrite(content: string): void {
    fs.mkdirSync(path.dirname(this.config.licenceFilePath), { recursive: true });
    const tmp = `${this.config.licenceFilePath}.tmp`;
    fs.writeFileSync(tmp, content, { encoding: 'utf8' });
    fs.renameSync(tmp, this.config.licenceFilePath);
  }
}
