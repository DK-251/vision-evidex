import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { generateKeyPairSync, sign, createHash } from 'node:crypto';
import { machineIdSync } from 'node-machine-id';
import { LicenceService } from '../src/main/services/licence.service';

function toBase64Url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function realFingerprint(): string {
  return createHash('sha256').update(machineIdSync(true)).digest('hex');
}

function mintToken(
  payload: Record<string, unknown>,
  privateKey: Parameters<typeof sign>[2]
): string {
  const header = toBase64Url(Buffer.from(JSON.stringify({ alg: 'Ed25519', typ: 'JWT' })));
  const body = toBase64Url(Buffer.from(JSON.stringify(payload)));
  const signingInput = `${header}.${body}`;
  const signature = sign(null, Buffer.from(signingInput, 'utf8'), privateKey);
  return `${signingInput}.${toBase64Url(signature)}`;
}

describe('LicenceService', () => {
  let tmpDir: string;
  let licencePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidex-licence-'));
    licencePath = path.join(tmpDir, 'licence.sig');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('none mode', () => {
    it('validate returns valid without touching filesystem', () => {
      const svc = new LicenceService({ mode: 'none', licenceFilePath: licencePath });
      expect(svc.validate()).toEqual({ valid: true, mode: 'none' });
      expect(fs.existsSync(licencePath)).toBe(false);
    });

    it('activate returns success without writing a licence file', async () => {
      const svc = new LicenceService({ mode: 'none', licenceFilePath: licencePath });
      expect(await svc.activate({ licenceKey: 'anything' })).toEqual({ success: true });
      expect(fs.existsSync(licencePath)).toBe(false);
    });

    it('deactivate is a no-op', async () => {
      const svc = new LicenceService({ mode: 'none', licenceFilePath: licencePath });
      await expect(svc.deactivate()).resolves.toBeUndefined();
    });
  });

  describe('keygen mode — dev bypass', () => {
    it('validate is short-circuited when isDev === true', () => {
      const svc = new LicenceService({
        mode: 'keygen',
        licenceFilePath: licencePath,
        isDev: true,
      });
      // No publicKeyPem, no file, yet validate returns valid because of dev bypass.
      expect(svc.validate()).toEqual({ valid: true, mode: 'keygen' });
    });
  });

  describe('keygen mode — validation', () => {
    const pair = generateKeyPairSync('ed25519');
    const publicKeyPem = pair.publicKey.export({ type: 'spki', format: 'pem' }) as string;

    it('fails with "no licence file present" when file is missing', () => {
      const svc = new LicenceService({
        mode: 'keygen',
        licenceFilePath: licencePath,
        publicKeyPem,
      });
      const result = svc.validate();
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/no licence file/);
    });

    it('fails with "server public key not configured" when key missing', () => {
      fs.writeFileSync(licencePath, 'placeholder');
      const svc = new LicenceService({ mode: 'keygen', licenceFilePath: licencePath });
      const result = svc.validate();
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/public key/);
    });

    it('fails with "signature verification failed" for tampered token', () => {
      const token = mintToken(
        { key: 'k', fingerprint: realFingerprint(), activatedAt: '2026-01-01' },
        pair.privateKey
      );
      const tampered = token.slice(0, -4) + 'AAAA';
      fs.writeFileSync(licencePath, tampered);
      const svc = new LicenceService({
        mode: 'keygen',
        licenceFilePath: licencePath,
        publicKeyPem,
      });
      const result = svc.validate();
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/signature/);
    });

    it('fails with "machine fingerprint mismatch" when fingerprint is wrong', () => {
      const token = mintToken(
        { key: 'k', fingerprint: 'WRONG_FINGERPRINT', activatedAt: '2026-01-01' },
        pair.privateKey
      );
      fs.writeFileSync(licencePath, token);
      const svc = new LicenceService({
        mode: 'keygen',
        licenceFilePath: licencePath,
        publicKeyPem,
      });
      const result = svc.validate();
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/fingerprint/);
    });

    it('fails with "licence expired" when expiresAt is past', () => {
      const token = mintToken(
        {
          key: 'k',
          fingerprint: realFingerprint(),
          activatedAt: '2026-01-01',
          expiresAt: '2026-01-02',
        },
        pair.privateKey
      );
      fs.writeFileSync(licencePath, token);
      const svc = new LicenceService({
        mode: 'keygen',
        licenceFilePath: licencePath,
        publicKeyPem,
        now: () => new Date('2026-04-18T00:00:00Z'),
      });
      const result = svc.validate();
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/expired/);
    });

    it('returns valid + caches LicenceInfo on a well-formed token', () => {
      const token = mintToken(
        {
          key: 'abc-123',
          fingerprint: realFingerprint(),
          activatedAt: '2026-01-01T00:00:00Z',
          expiresAt: '2027-01-01T00:00:00Z',
        },
        pair.privateKey
      );
      fs.writeFileSync(licencePath, token);
      const svc = new LicenceService({
        mode: 'keygen',
        licenceFilePath: licencePath,
        publicKeyPem,
        now: () => new Date('2026-04-18T00:00:00Z'),
      });
      expect(svc.validate()).toEqual({ valid: true, mode: 'keygen' });
      const info = svc.getLicenceInfo();
      expect(info?.licenceKey).toBe('abc-123');
      expect(info?.status).toBe('active');
      expect(info?.expiresAt).toBe('2027-01-01T00:00:00Z');
    });
  });

  describe('keygen mode — activate error paths', () => {
    it('refuses activation without keygenAccountId', async () => {
      const svc = new LicenceService({
        mode: 'keygen',
        licenceFilePath: licencePath,
      });
      const result = await svc.activate({ licenceKey: 'x' });
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/account id/);
    });
  });

  describe('deactivate (keygen)', () => {
    it('removes the licence file', async () => {
      fs.writeFileSync(licencePath, 'anything');
      const svc = new LicenceService({
        mode: 'keygen',
        licenceFilePath: licencePath,
      });
      await svc.deactivate();
      expect(fs.existsSync(licencePath)).toBe(false);
    });
  });
});
