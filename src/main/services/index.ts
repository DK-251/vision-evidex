/**
 * Service barrel. Handlers import services from here.
 * Never instantiated twice — the main process wires a single instance
 * of each service during app bootstrap (Phase 1 Week 3).
 */

export { CaptureService } from './capture.service';
export { SessionService } from './session.service';
export { EvidexContainerService } from './evidex-container.service';
export { DatabaseService } from './database.service';
export { ExportService } from './export.service';
export { MetricsImportService, type MetricsImportResult } from './metrics-import.service';
export { LicenceService } from './licence.service';
export { NamingService } from './naming.service';
export { ManifestService } from './manifest.service';
export { SettingsService } from './settings.service';
export { ShortcutService } from './shortcut.service';
export { TrayService } from './tray.service';
export { SignOffService } from './signoff.service';
