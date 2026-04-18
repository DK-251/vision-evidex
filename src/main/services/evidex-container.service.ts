import fs from 'node:fs';
import path from 'node:path';
import { ulid } from 'ulid';
import JSZip from 'jszip';
import type {
  ContainerHandle,
  CreateContainerConfig,
  ManifestEntry,
  ManifestFile,
  IntegrityCheckResult,
} from '@shared/types/entities';
import { encryptContainer, decryptContainer } from './container-crypto';

/**
 * EvidexContainerService — .evidex file I/O (AES-256-GCM-encrypted ZIP).
 *
 * Single-slot pattern (Architectural Rule 11): `open()` and `create()`
 * both close any currently-held handle first. There is at most one
 * container open per process at any time.
 *
 * In-memory model: when a container is open, its ZIP contents live as a
 * `Map<string, Buffer>` indexed by internal ZIP path. Mutations are
 * non-durable until `save()` is called. `save()` serialises the map
 * into a new ZIP, encrypts it, and performs the atomic rename dance
 * (`.tmp` → copy prior to `.bak` → rename `.tmp` → `.evidex`) per
 * Tech Spec §7.2. Steps 1 (WAL checkpoint) and 7 (version_history row)
 * are the project-DB layer's responsibility and wire in at D18.
 */

const MANIFEST_FILENAME = 'manifest.json';
const MANIFEST_SCHEMA_VERSION = '1';

export interface EvidexContainerServiceConfig {
  /** Password source; deterministic per machine so a container opens
   *  on the same device it was created on. Callers typically combine
   *  `EVIDEX_APP_SECRET` with the machine fingerprint. */
  password: Buffer | string;
}

interface OpenState {
  handle: ContainerHandle;
  entries: Map<string, Buffer>;
}

export class EvidexContainerService {
  private state: OpenState | null = null;

  constructor(private readonly config: EvidexContainerServiceConfig) {}

  getCurrentHandle(): ContainerHandle | null {
    return this.state ? { ...this.state.handle } : null;
  }

  async create(config: CreateContainerConfig): Promise<ContainerHandle> {
    if (this.state) await this.close(this.state.handle.containerId);

    const now = new Date().toISOString();
    const handle: ContainerHandle = {
      containerId: ulid(),
      projectId: config.projectId,
      filePath: config.filePath,
      openedAt: now,
    };
    const entries = new Map<string, Buffer>();
    const manifest: ManifestFile = {
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      projectId: config.projectId,
      entries: [],
    };
    entries.set(MANIFEST_FILENAME, Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));

    this.state = { handle, entries };
    // Persist immediately so the file exists on disk even before any
    // images are added. save() will overwrite later.
    await this.save(handle.containerId);
    return { ...handle };
  }

  async open(filePath: string): Promise<ContainerHandle> {
    if (this.state) await this.close(this.state.handle.containerId);

    const encrypted = await fs.promises.readFile(filePath);
    const zipBuffer = decryptContainer(encrypted, this.config.password);
    const zip = await JSZip.loadAsync(zipBuffer);

    const entries = new Map<string, Buffer>();
    await Promise.all(
      Object.keys(zip.files).map(async (name) => {
        const file = zip.files[name];
        if (!file || file.dir) return;
        const content = await file.async('nodebuffer');
        entries.set(name, content);
      })
    );

    const manifestBuffer = entries.get(MANIFEST_FILENAME);
    if (!manifestBuffer) {
      throw new Error(`container at ${filePath} is missing ${MANIFEST_FILENAME}`);
    }
    const manifest = JSON.parse(manifestBuffer.toString('utf8')) as ManifestFile;

    const handle: ContainerHandle = {
      containerId: ulid(),
      projectId: manifest.projectId,
      filePath,
      openedAt: new Date().toISOString(),
    };
    this.state = { handle, entries };
    return { ...handle };
  }

  async close(_containerId: string): Promise<void> {
    this.state = null;
  }

  async save(containerId: string): Promise<void> {
    const state = this.requireState(containerId);
    const filePath = state.handle.filePath;
    const tmpPath = `${filePath}.tmp`;
    const bakPath = `${filePath}.bak`;

    const zip = new JSZip();
    for (const [name, buf] of state.entries) {
      zip.file(name, buf);
    }
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    const encrypted = encryptContainer(zipBuffer, this.config.password);

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(tmpPath, encrypted);
    if (await fileExists(filePath)) {
      await fs.promises.copyFile(filePath, bakPath);
    }
    await fs.promises.rename(tmpPath, filePath);
  }

  getActivePath(containerId: string): string {
    return this.requireState(containerId).handle.filePath;
  }

  async addImage(
    containerId: string,
    filename: string,
    imageBuffer: Buffer,
    type: 'original' | 'annotated'
  ): Promise<string> {
    const state = this.requireState(containerId);
    const internalPath = `images/${type}/${filename}`;
    state.entries.set(internalPath, imageBuffer);
    return internalPath;
  }

  async extractImage(containerId: string, imagePath: string): Promise<Buffer> {
    const state = this.requireState(containerId);
    const buf = state.entries.get(imagePath);
    if (!buf) throw new Error(`image not found in container: ${imagePath}`);
    return buf;
  }

  async extractAllImages(
    containerId: string,
    type: 'original' | 'annotated' | 'both'
  ): Promise<Map<string, Buffer>> {
    const state = this.requireState(containerId);
    const out = new Map<string, Buffer>();
    for (const [name, buf] of state.entries) {
      if (!name.startsWith('images/')) continue;
      if (type === 'both' || name.startsWith(`images/${type}/`)) {
        out.set(name, buf);
      }
    }
    return out;
  }

  async appendManifest(containerId: string, entry: ManifestEntry): Promise<void> {
    const state = this.requireState(containerId);
    const manifest = await this.readManifest(containerId);
    manifest.entries.push(entry);
    state.entries.set(
      MANIFEST_FILENAME,
      Buffer.from(JSON.stringify(manifest, null, 2), 'utf8')
    );
  }

  async readManifest(containerId: string): Promise<ManifestFile> {
    const state = this.requireState(containerId);
    const buf = state.entries.get(MANIFEST_FILENAME);
    if (!buf) throw new Error(`container ${containerId} has no manifest`);
    return JSON.parse(buf.toString('utf8')) as ManifestFile;
  }

  async integrityCheck(_projectId: string): Promise<IntegrityCheckResult> {
    // ManifestService (D19) owns hash-recompute-and-compare logic.
    throw new Error('EvidexContainerService.integrityCheck — D19 (ManifestService)');
  }

  async getSizeBytes(containerId: string): Promise<number> {
    const state = this.requireState(containerId);
    const stat = await fs.promises.stat(state.handle.filePath);
    return stat.size;
  }

  private requireState(containerId: string): OpenState {
    if (!this.state) throw new Error('no container is currently open');
    if (this.state.handle.containerId !== containerId) {
      throw new Error(
        `containerId mismatch: expected ${this.state.handle.containerId}, got ${containerId}`
      );
    }
    return this.state;
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.promises.access(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
