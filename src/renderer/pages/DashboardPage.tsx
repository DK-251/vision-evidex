import { useEffect, useState } from 'react';
import type { MetricsSummary, RecentProject } from '@shared/types/entities';
import { useNavStore } from '../stores/nav-store';

/**
 * S-03 — Dashboard.
 *
 * Three zones per Tech Spec: metrics panel, quick links, recent
 * projects. The metrics IPC (`metrics:summary`) returns real
 * `activeProjects` (from recent_projects) and placeholder zeros for
 * the three session/capture/export counters — those wire up once the
 * project-DB is readable (Phase 2+).
 *
 * No session polling yet — SessionService is Phase 2 Wk7. The
 * "Session Active" pill renders only when a session-state query
 * returns one, so leaving it out today is safe.
 */

export function DashboardPage(): JSX.Element {
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [recent, setRecent] = useState<RecentProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      const [summaryResult, recentResult] = await Promise.all([
        window.evidexAPI.dashboard.summary(),
        window.evidexAPI.dashboard.recentProjects(),
      ]);
      if (cancelled) return;
      if (!summaryResult.ok) {
        setError(`metrics: ${summaryResult.error.message}`);
        return;
      }
      if (!recentResult.ok) {
        setError(`recent projects: ${recentResult.error.message}`);
        return;
      }
      setSummary(summaryResult.data);
      setRecent(recentResult.data);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-surface-primary p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
            <p className="text-sm text-text-secondary">Vision-EviDex overview</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-secondary font-mono">No session active</span>
            <button
              type="button"
              onClick={() => useNavStore.getState().goTo('settings')}
              className="text-sm px-3 py-1.5 rounded-md border border-border-subtle"
            >
              Settings
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-md border border-accent-error p-3 text-sm text-accent-error"
          >
            Failed to load dashboard: {error}
          </div>
        )}

        <section
          aria-label="Key metrics"
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <MetricCard label="Active projects" value={summary?.activeProjects ?? 0} />
          <MetricCard label="Sessions today" value={summary?.sessionsToday ?? 0} />
          <MetricCard label="Captures this week" value={summary?.capturesThisWeek ?? 0} />
          <MetricCard label="Exports this week" value={summary?.exportsThisWeek ?? 0} />
        </section>

        <section aria-label="Quick links" className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickLink label="Create project" hint="Start a new .evidex" />
          <QuickLink label="Open project" hint="Browse existing files" />
          <QuickLink label="Import metrics" hint="Load an XLSX into a project" />
          <QuickLink label="Replay tour" hint="Re-run the 3-screen intro" />
        </section>

        <section aria-label="Recent projects" className="space-y-2">
          <h2 className="text-sm font-semibold text-text-primary">Recent projects</h2>
          {recent === null ? (
            <p className="text-sm text-text-secondary">Loading…</p>
          ) : recent.length === 0 ? (
            <div className="rounded-md border border-dashed border-border-subtle p-6 text-center">
              <p className="text-text-primary">No projects yet.</p>
              <p className="text-sm text-text-secondary mt-1">
                Create your first project to start capturing evidence.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border-subtle border border-border-subtle rounded-md">
              {recent.map((p) => (
                <li key={p.projectId} className="p-3 flex items-center justify-between">
                  <div>
                    <div className="text-text-primary">{p.name}</div>
                    <div className="text-xs font-mono text-text-secondary">{p.filePath}</div>
                  </div>
                  <time className="text-xs text-text-secondary" dateTime={p.lastOpenedAt}>
                    {p.lastOpenedAt.slice(0, 10)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div
      className="p-4 rounded-lg"
      style={{ boxShadow: 'var(--shadow-neumorphic-out)' }}
    >
      <div className="text-xs uppercase tracking-wide text-text-secondary">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-text-primary">{value}</div>
    </div>
  );
}

function QuickLink({ label, hint }: { label: string; hint: string }): JSX.Element {
  return (
    <button
      type="button"
      className="p-3 rounded-md border border-border-subtle text-left hover:border-accent-primary"
    >
      <div className="text-text-primary">{label}</div>
      <div className="text-xs text-text-secondary mt-0.5">{hint}</div>
    </button>
  );
}
