import { createPublicKey, verify } from 'node:crypto';

/**
 * JWT-style Keygen.sh licence token handling.
 *
 * File format: `<header>.<payload>.<signature>` — three base64url
 * segments. Header and payload are base64url-encoded JSON. Signature
 * is an Ed25519 signature over the UTF-8 bytes of `<header>.<payload>`.
 *
 * Public key is PEM-encoded SPKI Ed25519 supplied at build / runtime
 * via `EVIDEX_KEYGEN_PUBLIC_KEY`. Loaded lazily so tests can inject a
 * generated keypair without touching the env.
 */

export interface LicenceTokenPayload {
  key: string;
  fingerprint: string;
  activatedAt: string;
  expiresAt?: string;
}

function fromBase64Url(segment: string): Buffer {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (padded.length % 4)) % 4);
  return Buffer.from(padded + padding, 'base64');
}

export function parseToken(raw: string): LicenceTokenPayload | null {
  const parts = raw.trim().split('.');
  if (parts.length !== 3) return null;
  const payloadSegment = parts[1];
  if (!payloadSegment) return null;
  try {
    const payload = JSON.parse(fromBase64Url(payloadSegment).toString('utf8'));
    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof payload.key !== 'string' ||
      typeof payload.fingerprint !== 'string' ||
      typeof payload.activatedAt !== 'string'
    ) {
      return null;
    }
    return payload as LicenceTokenPayload;
  } catch {
    return null;
  }
}

export function verifyToken(raw: string, publicKeyPem: string): boolean {
  const parts = raw.trim().split('.');
  if (parts.length !== 3) return false;
  const [header, payload, signature] = parts;
  if (!header || !payload || !signature) return false;
  try {
    const key = createPublicKey({ key: publicKeyPem, format: 'pem', type: 'spki' });
    return verify(
      null,
      Buffer.from(`${header}.${payload}`, 'utf8'),
      key,
      fromBase64Url(signature)
    );
  } catch {
    return false;
  }
}

export function isExpired(payload: LicenceTokenPayload, now: Date = new Date()): boolean {
  if (!payload.expiresAt) return false;
  const exp = Date.parse(payload.expiresAt);
  if (Number.isNaN(exp)) return true;
  return exp <= now.getTime();
}
