import type { DatabaseService } from './database.service';
import type { MetricsSummary } from '@shared/types/entities';

/**
 * MetricsService — Phase 3 placeholder. The Dashboard summary tile
 * currently only knows how many active projects exist; sessions /
 * captures / exports stay zero until Phase 3 Wk 13 wires the metrics
 * import pipeline. Constructor takes an optional clock so the future
 * "today / this week" queries can be unit-tested deterministically.
 */
export class MetricsService {
  constructor(
    private readonly appDb: DatabaseService,
    private readonly _opts: { now?: () => Date } = {}
  ) {}

  summary(): MetricsSummary {
    const activeProjects = this.appDb.getRecentProjects().length;
    return {
      activeProjects,
      sessionsToday: 0,
      capturesThisWeek: 0,
      exportsThisWeek: 0,
    };
  }
}
