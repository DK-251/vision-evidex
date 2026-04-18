import { pbkdf2Sync, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

/**
 * Crypto primitives for the `.evidex` container format.
 *
 * Derivation: PBKDF2-SHA256, 310,000 iterations, 32-byte key.
 * Cipher:     AES-256-GCM, random 96-bit IV, 128-bit auth tag.
 * Layout:     [magic(4)][version(1)][salt(16)][iv(12)][tag(16)][ciphertext]
 *
 * Wk4 security gate (see BACKLOG 2026-04-18): every call verifies the
 * GCM auth tag on decrypt; any tamper — ciphertext byte flip, tag byte
 * flip, wrong password — raises EvidexError(CONTAINER_DECRYPT_FAILED)
 * rather than returning partial plaintext. Covered by tests.
 */

export const PBKDF2_ITERATIONS = 310_000;
export const KEY_LENGTH_BYTES = 32;
export const SALT_LENGTH_BYTES = 16;
export const IV_LENGTH_BYTES = 12;
export const TAG_LENGTH_BYTES = 16;
export const MAGIC = Buffer.from('EVDX', 'ascii');
export const FORMAT_VERSION = 1;
export const HEADER_LENGTH =
  MAGIC.length + 1 + SALT_LENGTH_BYTES + IV_LENGTH_BYTES + TAG_LENGTH_BYTES;

export class ContainerCryptoError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'BAD_MAGIC'
      | 'UNSUPPORTED_VERSION'
      | 'TRUNCATED'
      | 'AUTH_TAG_MISMATCH'
      | 'DECRYPT_FAILED'
  ) {
    super(message);
    this.name = 'ContainerCryptoError';
  }
}

export function deriveKey(password: Buffer | string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH_BYTES, 'sha256');
}

export function encryptContainer(plaintext: Buffer, password: Buffer | string): Buffer {
  const salt = randomBytes(SALT_LENGTH_BYTES);
  const iv = randomBytes(IV_LENGTH_BYTES);
  const key = deriveKey(password, salt);

  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([
    MAGIC,
    Buffer.from([FORMAT_VERSION]),
    salt,
    iv,
    tag,
    ciphertext,
  ]);
}

export function decryptContainer(encrypted: Buffer, password: Buffer | string): Buffer {
  if (encrypted.length < HEADER_LENGTH) {
    throw new ContainerCryptoError('container truncated below header length', 'TRUNCATED');
  }
  let offset = 0;
  const magic = encrypted.subarray(offset, offset + MAGIC.length);
  offset += MAGIC.length;
  if (!magic.equals(MAGIC)) {
    throw new ContainerCryptoError('magic bytes do not match EVDX', 'BAD_MAGIC');
  }
  const version = encrypted[offset];
  offset += 1;
  if (version !== FORMAT_VERSION) {
    throw new ContainerCryptoError(
      `unsupported container version ${version}`,
      'UNSUPPORTED_VERSION'
    );
  }
  const salt = encrypted.subarray(offset, offset + SALT_LENGTH_BYTES);
  offset += SALT_LENGTH_BYTES;
  const iv = encrypted.subarray(offset, offset + IV_LENGTH_BYTES);
  offset += IV_LENGTH_BYTES;
  const tag = encrypted.subarray(offset, offset + TAG_LENGTH_BYTES);
  offset += TAG_LENGTH_BYTES;
  const ciphertext = encrypted.subarray(offset);

  const key = deriveKey(password, salt);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch (err) {
    // `final()` throws 'Unsupported state or unable to authenticate data'
    // when tag/key/ciphertext are inconsistent. Normalise to our typed error
    // so callers don't depend on Node's message string.
    throw new ContainerCryptoError(
      `auth tag verification failed: ${(err as Error).message}`,
      'AUTH_TAG_MISMATCH'
    );
  }
}
