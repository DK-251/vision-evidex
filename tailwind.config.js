/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/**/*.{html,ts,tsx}',
    './src/toolbar/**/*.{html,ts,tsx}',
    './src/annotation/**/*.{html,ts,tsx}',
    './src/region/**/*.{html,ts,tsx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        accent: {
          DEFAULT: 'var(--color-accent)',
          light: 'var(--color-accent-light)',
          dark: 'var(--color-accent-dark)',
        },
        status: {
          pass: 'var(--color-pass)',
          'pass-bg': 'var(--color-pass-bg)',
          fail: 'var(--color-fail)',
          'fail-bg': 'var(--color-fail-bg)',
          blocked: 'var(--color-blocked)',
          'blocked-bg': 'var(--color-blocked-bg)',
          untagged: 'var(--color-untagged)',
          'untagged-bg': 'var(--color-untagged-bg)',
        },
        surface: {
          primary: 'var(--surface-primary)',
          secondary: 'var(--surface-secondary)',
          glass: 'var(--surface-glass)',
          'modal-glass': 'var(--surface-modal-glass)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          hint: 'var(--text-hint)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        'neumorphic-out': 'var(--shadow-neumorphic-out)',
        'neumorphic-in': 'var(--shadow-neumorphic-in)',
      },
      backdropBlur: {
        glass: '12px',
        'glass-heavy': '20px',
      },
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
      },
    },
  },
  plugins: [],
};
