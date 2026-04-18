/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/**/*.{html,ts,tsx}',
    './src/toolbar/**/*.{html,ts,tsx}',
    './src/annotation/**/*.{html,ts,tsx}',
    './src/region/**/*.{html,ts,tsx}',
  ],
  /**
   * Fluent-era config: dark mode is driven by `[data-theme='dark']` CSS
   * variable overrides in tokens.css — the `dark:` Tailwind prefix is
   * banned (doc §10.3). Colour values are not mapped into Tailwind at
   * all; components consume them via `style={{ color: 'var(--color-…)' }}`
   * or via the ui/* primitives that land in FUI-2. Tailwind's remaining
   * job is spacing, flex/grid, and radius.
   */
  darkMode: false,
  theme: {
    extend: {
      fontFamily: {
        sans: ['Segoe UI Variable Text', 'Segoe UI Variable', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['Segoe UI Variable Display', 'Segoe UI Variable', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['Cascadia Code', 'Cascadia Mono', 'Consolas', 'Courier New', 'monospace'],
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        12: '48px',
      },
      borderRadius: {
        control: '4px',
        card:    '8px',
        overlay: '8px',
        dialog:  '8px',
      },
      /* ═══════════════════════════════════════════════════════════════
       * FUI-1 TEMPORARY ALIASES — remove in FUI-5.
       * Keep pre-Fluent Tailwind classes (bg-surface-primary,
       * text-text-primary, border-border-subtle, rounded-md, etc.)
       * resolving during FUI-2/3/4. Every existing D25 component
       * depends on these class names — FUI-4 is the port.
       * ═══════════════════════════════════════════════════════════════ */
      colors: {
        accent: {
          DEFAULT: 'var(--color-accent-default)',  /* DEPRECATED — remove in FUI-5 */
          primary: 'var(--color-accent-default)',  /* DEPRECATED — remove in FUI-5 */
          light:   'var(--color-fill-accent-subtle)', /* DEPRECATED — remove in FUI-5 */
          dark:    'var(--color-accent-dark-1)',   /* DEPRECATED — remove in FUI-5 */
          error:   'var(--color-status-fail)',     /* DEPRECATED — remove in FUI-5 */
        },
        status: {
          pass:        'var(--color-status-pass)',        /* DEPRECATED — remove in FUI-5 */
          'pass-bg':   'var(--color-status-pass-bg)',     /* DEPRECATED — remove in FUI-5 */
          fail:        'var(--color-status-fail)',        /* DEPRECATED — remove in FUI-5 */
          'fail-bg':   'var(--color-status-fail-bg)',     /* DEPRECATED — remove in FUI-5 */
          blocked:     'var(--color-status-blocked)',     /* DEPRECATED — remove in FUI-5 */
          'blocked-bg':'var(--color-status-blocked-bg)',  /* DEPRECATED — remove in FUI-5 */
          untagged:    'var(--color-status-untagged)',    /* DEPRECATED — remove in FUI-5 */
          'untagged-bg':'var(--color-status-untagged-bg)',/* DEPRECATED — remove in FUI-5 */
        },
        surface: {
          primary:      'var(--color-layer-1)',       /* DEPRECATED — remove in FUI-5 */
          secondary:    'var(--color-layer-0)',       /* DEPRECATED — remove in FUI-5 */
          glass:        'var(--color-layer-acrylic)', /* DEPRECATED — remove in FUI-5 */
          'modal-glass':'var(--color-layer-3)',       /* DEPRECATED — remove in FUI-5 */
        },
        text: {
          primary:   'var(--color-text-primary)',   /* DEPRECATED — remove in FUI-5 */
          secondary: 'var(--color-text-secondary)', /* DEPRECATED — remove in FUI-5 */
          hint:      'var(--color-text-tertiary)',  /* DEPRECATED — remove in FUI-5 */
        },
        border: {
          DEFAULT: 'var(--color-stroke-default)', /* DEPRECATED — remove in FUI-5 */
          subtle:  'var(--color-stroke-default)', /* DEPRECATED — remove in FUI-5 */
        },
      },
      boxShadow: {
        'neumorphic-out': 'var(--shadow-card)', /* DEPRECATED — remove in FUI-5 */
        'neumorphic-in':  'none',               /* DEPRECATED — remove in FUI-5 */
      },
      backdropBlur: {
        glass:         '30px', /* DEPRECATED — remove in FUI-5 */
        'glass-heavy': '40px', /* DEPRECATED — remove in FUI-5 */
      },
      transitionDuration: {
        fast:   '83ms',  /* DEPRECATED — remove in FUI-5 */
        normal: '167ms', /* DEPRECATED — remove in FUI-5 */
        slow:   '250ms', /* DEPRECATED — remove in FUI-5 */
      },
    },
  },
  plugins: [],
};
