/**
 * Compute the light/dark accent stops from a base accent colour and
 * push them onto `document.documentElement` as CSS custom properties.
 *
 * Source: Docs MD/07-VisionEviDex-FluentUI-DesignSystem-v1_0.md §9.2.
 * Called whenever the main process broadcasts `theme:accentColourUpdate`.
 */

function clamp(value: number): number {
  return Math.max(0, Math.min(255, value));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  return {
    r: parseInt(cleaned.slice(0, 2), 16),
    g: parseInt(cleaned.slice(2, 4), 16),
    b: parseInt(cleaned.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const n = (clamp(r) << 16) | (clamp(g) << 8) | clamp(b);
  return `#${n.toString(16).padStart(6, '0').toUpperCase()}`;
}

function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + amount, g + amount, b + amount);
}

function darken(hex: string, amount: number): string {
  return lighten(hex, -amount);
}

export function applyAccentScale(accent: string): void {
  if (!/^#[0-9a-fA-F]{6}$/.test(accent)) return;
  const root = document.documentElement;
  const { r, g, b } = hexToRgb(accent);

  root.style.setProperty('--color-accent-default', accent);
  root.style.setProperty('--color-accent-light-1', lighten(accent, 40));
  root.style.setProperty('--color-accent-light-2', lighten(accent, 80));
  root.style.setProperty('--color-accent-light-3', lighten(accent, 120));
  root.style.setProperty('--color-accent-dark-1', darken(accent, 20));
  root.style.setProperty('--color-accent-dark-2', darken(accent, 40));
  root.style.setProperty('--color-accent-dark-3', darken(accent, 60));
  root.style.setProperty('--color-fill-accent-subtle', `rgba(${r}, ${g}, ${b}, 0.08)`);

  root.style.setProperty('--accent-r', String(r));
  root.style.setProperty('--accent-g', String(g));
  root.style.setProperty('--accent-b', String(b));
}
