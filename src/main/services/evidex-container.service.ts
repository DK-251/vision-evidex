import fs from 'node:fs';
import os from 'node:os';
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
import { DatabaseService } from './database.service';

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
/**
 * The per-container project DB lives extracted under
 * `os.tmpdir()/evidex-work/<containerId>/project.db` for the duration
 * the container is open. On every `save()` it is WAL-checkpointed and
 * slurped back into the ZIP at the internal path below; `close()`
 * removes the temp directory.
 *
 * Architectural Rule 11 (single-slot) is preserved — only one
 * project DB exists at any time, owned by `OpenState`.
 */
const PROJECT_DB_INTERNAL_PATH = 'project.db';
const TMP_WORK_ROOT = path.join(os.tmpdir(), 'evidex-work');

export interface EvidexContainerServiceConfig {
  /** Password source; deterministic per machine so a container opens
   *  on the same device it was created on. Callers typically combine
   *  `EVIDEX_APP_SECRET` with the machine fingerprint. */
  password: Buffer | string;
}

interface OpenState {
  handle: ContainerHandle;
  entries: Map<string, Buffer>;
  projectDb: DatabaseService;
  projectDbTmpDir: string;
  projectDbTmpPath: string;
}

export class EvidexContainerService {
  private state: OpenState | null = null;

  constructor(private readonly config: EvidexContainerServiceConfig) {}

  getCurrentHandle(): ContainerHandle | null {
    return this.state ? { ...this.state.handle } : null;
  }

  /**
   * The project DB tied to the currently-open container, or null when
   * nothing is open. Returned reference is the live instance — do not
   * cache across open/close calls. Wired into ServiceRegistry.getProjectDb
   * so SessionService / CaptureService can resolve it on every invocation.
   */
  getProjectDb(): DatabaseService | null {
    return this.state?.projectDb ?? null;
  }

  async create(config: CreateContainerConfig): Promise<ContainerHandle> {
    if (this.state) await this.close(this.state.handle.containerId);

    const now = new Date().toISOString();
    const containerId = ulid();
    const handle: ContainerHandle = {
      containerId,
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

    const { projectDb, projectDbTmpDir, projectDbTmpPath } =
      this.spawnProjectDb(containerId, /* existingBuffer */ null);

    this.state = { handle, entries, projectDb, projectDbTmpDir, projectDbTmpPath };
    // Persist immediately so the file exists on disk even before any
    // images are added. save() will WAL-checkpoint + slurp project.db too.
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

    const containerId = ulid();
    const handle: ContainerHandle = {
      containerId,
      projectId: manifest.projectId,
      filePath,
      openedAt: new Date().toISOString(),
    };

    // Restore the per-container project DB. If the entry exists (any
    // container created at or after Wk 8) we hydrate it back to a
    // tmpfile; legacy/empty containers get a fresh in-memory schema.
    const dbBuf = entries.get(PROJECT_DB_INTERNAL_PATH) ?? null;
    const { projectDb, projectDbTmpDir, projectDbTmpPath } =
      this.spawnProjectDb(containerId, dbBuf);

    this.state = { handle, entries, projectDb, projectDbTmpDir, projectDbTmpPath };
    return { ...handle };
  }

  async close(_containerId: string): Promise<void> {
    if (!this.state) return;
    try {
      this.state.projectDb.close();
    } catch {
      // Closing twice or on a faulted DB shouldn't block container teardown.
    }
    const tmpDir = this.state.projectDbTmpDir;
    this.state = null;
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup — leaking a tmp dir is preferable to throwing
      // on close (callers expect close to succeed).
    }
  }

  async save(containerId: string): Promise<void> {
    const state = this.requireState(containerId);
    const filePath = state.handle.filePath;
    const tmpPath = `${filePath}.tmp`;
    const bakPath = `${filePath}.bak`;

    // 1. Flush WAL → main DB file so the bytes we slurp are complete
    //    (Tech Spec §7.2 step 1). Any in-flight transactions will have
    //    finished before the IPC handler called save().
    try {
      state.projectDb.walCheckpoint();
    } catch {
      // walCheckpoint can fail on a closed/empty DB; the slurp below
      // still succeeds because the file always exists on disk.
    }
    // 2. Slurp the project DB file into the entries map. Read every save
    //    — we never assume entries.get('project.db') is up to date with
    //    in-process writes.
    const dbBuf = await fs.promises.readFile(state.projectDbTmpPath);
    state.entries.set(PROJECT_DB_INTERNAL_PATH, dbBuf);

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

  /**
   * D28 — auto-backup: copy current .evidex to .evidex.bak (overwrites
   * prior backup). Called after every 10th capture. Never throws —
   * backup failure is logged by the caller but must not abort the
   * capture pipeline.
   */
  async backup(containerId: string): Promise<void> {
    const state = this.requireState(containerId);
    const { filePath } = state.handle;
    if (!(await fileExists(filePath))) return;
    await fs.promises.copyFile(filePath, `${filePath}.bak`);
  }

  /**
   * W9 — extract a single file from the open container by its internal path.
   * Returns the raw Buffer or null if the entry doesn\'t exist.
   * Used by CaptureService.getThumbnail() to load original JPEGs for
   * historical sessions without exposing them to the renderer directly.
   */
  async extractImage(containerId: string, entryPath: string): Promise<Buffer | null> {
    const state = this.requireState(containerId);
    const entry = state.entries.get(entryPath);
    return entry ?? null;
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

  /**
   * Materialise (or hydrate) the per-container project DB at
   * `<tmpdir>/evidex-work/<containerId>/project.db` and return the
   * live DatabaseService bound to it. `existingBuffer` is the bytes
   * extracted from a freshly-opened ZIP entry; pass null when creating.
   */
  private spawnProjectDb(
    containerId: string,
    existingBuffer: Buffer | null
  ): { projectDb: DatabaseService; projectDbTmpDir: string; projectDbTmpPath: string } {
    const tmpDir = path.join(TMP_WORK_ROOT, containerId);
    fs.mkdirSync(tmpDir, { recursive: true });
    const tmpPath = path.join(tmpDir, 'project.db');
    if (existingBuffer) {
      fs.writeFileSync(tmpPath, existingBuffer);
    }
    const projectDb = new DatabaseService(tmpPath);
    // initProjectSchema is idempotent — already-applied migrations are
    // recorded in schema_migrations and skipped on re-run, so this is
    // safe both for newly-created and hydrated DBs.
    projectDb.initProjectSchema();
    return { projectDb, projectDbTmpDir: tmpDir, projectDbTmpPath: tmpPath };
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
