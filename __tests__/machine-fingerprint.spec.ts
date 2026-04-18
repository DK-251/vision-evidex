import { describe, it, expect } from 'vitest';
import { getMachineFingerprint } from '../src/main/services/machine-fingerprint';

describe('getMachineFingerprint', () => {
  it('returns a 64-char lowercase hex (sha256)', () => {
    const fp = getMachineFingerprint();
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is stable across calls on the same machine', () => {
    const a = getMachineFingerprint();
    const b = getMachineFingerprint();
    expect(a).toBe(b);
  });
});
