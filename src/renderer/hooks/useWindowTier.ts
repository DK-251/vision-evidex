import { useEffect } from 'react';
import { useNavStore } from '../stores/nav-store';

/**
 * Observes the body width and sets `data-tier` on the document root so
 * CSS can apply tier-appropriate padding and layout.
 *
 * Tiers:
 *   compact     < 900px  — collapsed sidebar, tight padding
 *   standard    900–1199px — normal padding
 *   comfortable 1200–1599px — normal padding
 *   wide        ≥ 1600px — generous padding
 *
 * Also auto-collapses the sidebar when the window drops below 900px.
 * Call once inside Shell so the observer is mounted for the entire app session.
 */

const TIERS = [
  { width: 0,    name: 'compact' },
  { width: 900,  name: 'standard' },
  { width: 1200, name: 'comfortable' },
  { width: 1600, name: 'wide' },
] as const;

export function useWindowTier(): void {
  useEffect(() => {
    function applyTier(totalWidth: number): void {
      // Guard against 0-width reads before layout is complete.
      if (totalWidth === 0) return;
      const tier = [...TIERS]
        .reverse()
        .find((t) => totalWidth >= t.width)?.name ?? 'compact';
      document.documentElement.setAttribute('data-tier', tier);

      // Auto-collapse the sidebar at narrow widths.
      const shouldCollapse = totalWidth < 900;
      const store = useNavStore.getState();
      if (shouldCollapse !== store.sidebarCollapsed) {
        store.setSidebarCollapsed(shouldCollapse);
      }
    }

    // Apply immediately on mount. Use window.innerWidth as the
    // authoritative source since clientWidth may be 0 before paint.
    const initial = window.innerWidth || document.body.clientWidth;
    applyTier(initial);

    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      // Use window.innerWidth for accuracy — contentRect may lag on first paint.
      const w = (entry ? entry.contentRect.width : 0) || window.innerWidth;
      if (w > 0) applyTier(w);
    });

    obs.observe(document.body);
    return () => obs.disconnect();
  }, []);
}
