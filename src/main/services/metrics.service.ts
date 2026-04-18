import type { DatabaseService } from './database.service';
import type { MetricsSummary } from '@shared/types/entities';

/**
 * MetricsService — dashboard summary queries against `app.db`.
 *
 * Phase 1 Wk5 D23: `activeProjects` is implemented against the real
 * `recent_projects` table. `sessionsToday`, `capturesThisWeek`, and
 * `exportsThisWeek` return zero until Phase 2+ wires the project-DB
 * (sessions / captures) and the exports log. The return shape is
 * stable so the Dashboard UI and its tests are forward-compatible.
 */
export class MetricsService {
  constructor(
    private readonly appDb: DatabaseService,
    private readonly opts: { now?: () => Date } = {}
  ) {}

  summary(): MetricsSummary {
    const activeProjects = this.appDb.getRecentProjects().length;
    // Placeholder values — rewired Phase 2+ once project-DB is open.
    void this.opts.now;
    return {
      activeProjects,
      sessionsToday: 0,
      capturesThisWeek: 0,
      exportsThisWeek: 0,
    };
  }
}
