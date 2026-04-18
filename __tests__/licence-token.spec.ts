import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import { parseToken, verifyToken, isExpired } from '../src/main/services/licence-token';

function toBase64Url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function mintToken(
  payload: Record<string, unknown>,
  privateKey: KeyObject
): string {
  const header = toBase64Url(Buffer.from(JSON.stringify({ alg: 'Ed25519', typ: 'JWT' })));
  const body = toBase64Url(Buffer.from(JSON.stringify(payload)));
  const signingInput = `${header}.${body}`;
  const signature = sign(null, Buffer.from(signingInput, 'utf8'), privateKey);
  return `${signingInput}.${toBase64Url(signature)}`;
}

describe('licence-token', () => {
  let publicKeyPem: string;
  let privateKey: KeyObject;
  let otherPrivateKey: KeyObject;

  beforeAll(() => {
    const pair = generateKeyPairSync('ed25519');
    publicKeyPem = pair.publicKey.export({ type: 'spki', format: 'pem' }) as string;
    privateKey = pair.privateKey;
    otherPrivateKey = generateKeyPairSync('ed25519').privateKey;
  });

  it('parses a well-formed token payload', () => {
    const token = mintToken(
      { key: 'abc', fingerprint: 'fp', activatedAt: '2026-04-18T00:00:00Z' },
      privateKey
    );
    expect(parseToken(token)).toEqual({
      key: 'abc',
      fingerprint: 'fp',
      activatedAt: '2026-04-18T00:00:00Z',
    });
  });

  it('returns null for malformed token', () => {
    expect(parseToken('not.a.token')).toBeNull();
    expect(parseToken('only.two')).toBeNull();
    expect(parseToken('')).toBeNull();
  });

  it('returns null when required fields missing', () => {
    const token = mintToken({ key: 'abc' }, privateKey);
    expect(parseToken(token)).toBeNull();
  });

  it('verifies a token signed with the matching key', () => {
    const token = mintToken(
      { key: 'abc', fingerprint: 'fp', activatedAt: '2026-04-18T00:00:00Z' },
      privateKey
    );
    expect(verifyToken(token, publicKeyPem)).toBe(true);
  });

  it('rejects a token signed with a different key', () => {
    const token = mintToken(
      { key: 'abc', fingerprint: 'fp', activatedAt: '2026-04-18T00:00:00Z' },
      otherPrivateKey
    );
    expect(verifyToken(token, publicKeyPem)).toBe(false);
  });

  it('rejects a token whose payload was tampered after signing', () => {
    const token = mintToken(
      { key: 'abc', fingerprint: 'fp', activatedAt: '2026-04-18T00:00:00Z' },
      privateKey
    );
    const parts = token.split('.');
    const tamperedPayload = toBase64Url(
      Buffer.from(JSON.stringify({ key: 'DIFFERENT', fingerprint: 'fp', activatedAt: '2026-04-18T00:00:00Z' }))
    );
    const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    expect(verifyToken(tampered, publicKeyPem)).toBe(false);
  });

  it('isExpired: false when no expiresAt', () => {
    expect(
      isExpired({ key: 'a', fingerprint: 'b', activatedAt: '2026-01-01T00:00:00Z' })
    ).toBe(false);
  });

  it('isExpired: true when expiresAt is in the past', () => {
    expect(
      isExpired(
        { key: 'a', fingerprint: 'b', activatedAt: '2026-01-01', expiresAt: '2026-01-02' },
        new Date('2026-04-18T00:00:00Z')
      )
    ).toBe(true);
  });

  it('isExpired: false when expiresAt is in the future', () => {
    expect(
      isExpired(
        { key: 'a', fingerprint: 'b', activatedAt: '2026-01-01', expiresAt: '2027-01-01' },
        new Date('2026-04-18T00:00:00Z')
      )
    ).toBe(false);
  });
});
