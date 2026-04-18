import { createHash } from 'node:crypto';
import { machineIdSync } from 'node-machine-id';

/**
 * Stable per-machine identifier used to bind an activated licence to
 * one physical machine (Keygen activation limit). The raw machine-id
 * is hashed with SHA-256 so the bound value is not reversible and
 * cannot be used to identify the user's hardware off-device.
 *
 * `node-machine-id` reads the Windows SID / DBus machine-id / Darwin
 * IOPlatformUUID — deterministic across reboots but changes on
 * hardware replacement, which matches Keygen.sh's binding semantics.
 */
export function getMachineFingerprint(): string {
  const raw = machineIdSync(true);
  return createHash('sha256').update(raw).digest('hex');
}
