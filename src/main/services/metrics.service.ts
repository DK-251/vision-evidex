import type { DatabaseService } from './database.service';
import type { MetricsSummary } from '@shared/types/entities';

export class MetricsService {
  constructor(
    private readonly appDb: DatabaseService,
    private readonly opts: { now?: () => Date } = {}
  ) {}

  summary(): MetricsSummary {
    const activeProjects = this.appDb.getRecentProjects().length;
    void this.opts.now;
    return {
      activeProjects,
      sessionsToday: 0,
      capturesThisWeek: 0,
      exportsThisWeek: 0,
    };
  }
}
