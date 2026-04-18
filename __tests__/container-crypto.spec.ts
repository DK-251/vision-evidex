import { describe, it, expect } from 'vitest';
import {
  encryptContainer,
  decryptContainer,
  deriveKey,
  MAGIC,
  FORMAT_VERSION,
  HEADER_LENGTH,
  SALT_LENGTH_BYTES,
  IV_LENGTH_BYTES,
  TAG_LENGTH_BYTES,
  ContainerCryptoError,
  PBKDF2_ITERATIONS,
  KEY_LENGTH_BYTES,
} from '../src/main/services/container-crypto';

const PASSWORD = 'correct-horse-battery-staple';

describe('container-crypto', () => {
  describe('deriveKey', () => {
    it('produces a 32-byte key', () => {
      const salt = Buffer.alloc(SALT_LENGTH_BYTES, 1);
      expect(deriveKey(PASSWORD, salt).length).toBe(KEY_LENGTH_BYTES);
    });

    it('is deterministic for the same password + salt', () => {
      const salt = Buffer.alloc(SALT_LENGTH_BYTES, 2);
      expect(deriveKey(PASSWORD, salt).equals(deriveKey(PASSWORD, salt))).toBe(true);
    });

    it('differs when salt differs', () => {
      const a = deriveKey(PASSWORD, Buffer.alloc(SALT_LENGTH_BYTES, 1));
      const b = deriveKey(PASSWORD, Buffer.alloc(SALT_LENGTH_BYTES, 2));
      expect(a.equals(b)).toBe(false);
    });

    it('uses the documented iteration count', () => {
      // Guard against accidental regressions — the 310k figure is a
      // Wk4 security-gate constant and must not drop silently.
      expect(PBKDF2_ITERATIONS).toBe(310_000);
    });
  });

  describe('encryptContainer / decryptContainer', () => {
    it('round-trips a typical payload', () => {
      const plain = Buffer.from('the quick brown fox jumps over the lazy dog');
      const enc = encryptContainer(plain, PASSWORD);
      expect(decryptContainer(enc, PASSWORD).equals(plain)).toBe(true);
    });

    it('writes the expected header: magic + version', () => {
      const enc = encryptContainer(Buffer.from('hi'), PASSWORD);
      expect(enc.subarray(0, MAGIC.length).equals(MAGIC)).toBe(true);
      expect(enc[MAGIC.length]).toBe(FORMAT_VERSION);
    });

    it('header is at least HEADER_LENGTH bytes long', () => {
      const enc = encryptContainer(Buffer.from(''), PASSWORD);
      expect(enc.length).toBeGreaterThanOrEqual(HEADER_LENGTH);
    });

    it('produces different output each time (random IV + salt)', () => {
      const plain = Buffer.from('same plaintext');
      const a = encryptContainer(plain, PASSWORD);
      const b = encryptContainer(plain, PASSWORD);
      expect(a.equals(b)).toBe(false);
    });

    it('rejects wrong password with AUTH_TAG_MISMATCH', () => {
      const enc = encryptContainer(Buffer.from('x'), PASSWORD);
      expect(() => decryptContainer(enc, 'wrong-password')).toThrow(ContainerCryptoError);
      try {
        decryptContainer(enc, 'wrong-password');
      } catch (err) {
        expect((err as ContainerCryptoError).code).toBe('AUTH_TAG_MISMATCH');
      }
    });

    it('rejects flipped ciphertext byte with AUTH_TAG_MISMATCH', () => {
      const enc = encryptContainer(Buffer.from('sensitive payload'), PASSWORD);
      const tampered = Buffer.from(enc);
      // Flip a byte well past the header, inside ciphertext.
      tampered[HEADER_LENGTH + 2] = tampered[HEADER_LENGTH + 2] ^ 0xff;
      expect(() => decryptContainer(tampered, PASSWORD)).toThrow(ContainerCryptoError);
      try {
        decryptContainer(tampered, PASSWORD);
      } catch (err) {
        expect((err as ContainerCryptoError).code).toBe('AUTH_TAG_MISMATCH');
      }
    });

    it('rejects flipped auth-tag byte with AUTH_TAG_MISMATCH', () => {
      const enc = encryptContainer(Buffer.from('payload'), PASSWORD);
      const tagOffset = MAGIC.length + 1 + SALT_LENGTH_BYTES + IV_LENGTH_BYTES;
      const tampered = Buffer.from(enc);
      tampered[tagOffset] = tampered[tagOffset] ^ 0x01;
      expect(() => decryptContainer(tampered, PASSWORD)).toThrow(ContainerCryptoError);
    });

    it('rejects truncated container with TRUNCATED', () => {
      expect(() => decryptContainer(Buffer.alloc(10), PASSWORD)).toThrow(ContainerCryptoError);
      try {
        decryptContainer(Buffer.alloc(10), PASSWORD);
      } catch (err) {
        expect((err as ContainerCryptoError).code).toBe('TRUNCATED');
      }
    });

    it('rejects wrong magic bytes with BAD_MAGIC', () => {
      const enc = encryptContainer(Buffer.from('x'), PASSWORD);
      const tampered = Buffer.from(enc);
      tampered[0] = 0x00;
      try {
        decryptContainer(tampered, PASSWORD);
        throw new Error('expected throw');
      } catch (err) {
        expect((err as ContainerCryptoError).code).toBe('BAD_MAGIC');
      }
    });

    it('rejects unknown version byte with UNSUPPORTED_VERSION', () => {
      const enc = encryptContainer(Buffer.from('x'), PASSWORD);
      const tampered = Buffer.from(enc);
      tampered[MAGIC.length] = 99; // unknown format version
      try {
        decryptContainer(tampered, PASSWORD);
        throw new Error('expected throw');
      } catch (err) {
        expect((err as ContainerCryptoError).code).toBe('UNSUPPORTED_VERSION');
      }
    });
  });
});
