import type { CSSProperties } from 'react';
import type { FluentIconsProps } from '@fluentui/react-icons';

/**
 * Vision-EviDex brand icon set. Inline React-SVG twins of the
 * authoritative `build/icons/*.svg` files (the SVG files are the
 * packaging source of truth; these are what the renderer actually
 * imports).
 *
 * Scope: only the two glyphs that carry the Vision-EviDex brand
 * identity — the small app mark used in the title bar, and the
 * animated hero used on the onboarding welcome screen. Per-step
 * onboarding icons continue to use `@fluentui/react-icons`.
 */

type BrandIconProps = FluentIconsProps;

function sizeOf(props: BrandIconProps): number {
  const v = props.fontSize;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 32;
  }
  return 32;
}

function svgProps(props: BrandIconProps): {
  width: number; height: number; style: CSSProperties;
  'aria-hidden': boolean;
  focusable: 'false';
} {
  const size = sizeOf(props);
  return {
    width: size,
    height: size,
    style: { flexShrink: 0 },
    'aria-hidden': true,
    focusable: 'false',
  };
}

/* ─── AppMark — small aperture on navy rounded square ───────────── */

export function AppMark(props: BrandIconProps): JSX.Element {
  const id = 'am';
  return (
    <svg {...svgProps(props)} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="50%" r="75%">
          <stop offset="0%" stopColor="#0E3D7A"/>
          <stop offset="100%" stopColor="#051D3D"/>
        </radialGradient>
        <linearGradient id={`${id}-st`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0078D4"/>
          <stop offset="100%" stopColor="#00B4D8"/>
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill={`url(#${id}-bg)`}/>
      <g transform="translate(16 16)" fill={`url(#${id}-st)`} stroke={`url(#${id}-st)`} strokeWidth="1" strokeLinejoin="round">
        <path d="M 0 -7 L 1.8 -2 L 6.1 -3.5 L 3.5 0 L 6.1 3.5 L 1.8 2 L 0 7 L -1.8 2 L -6.1 3.5 L -3.5 0 L -6.1 -3.5 L -1.8 -2 Z"/>
      </g>
      <circle cx="25" cy="25" r="3" fill="#60CDFF"/>
    </svg>
  );
}

/* ─── OnboardingHero — animated aperture + document + shield ────── */

export function OnboardingHero({ size = 120 }: { size?: number } = {}): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="hb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0078D4"/><stop offset="100%" stopColor="#00B4D8"/>
        </linearGradient>
        <radialGradient id="hg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#60CDFF" stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#60CDFF" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="hsh" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0078D4" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#6B2FBA" stopOpacity="0.4"/>
        </linearGradient>
        <linearGradient id="hscan" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#60CDFF" stopOpacity="0"/>
          <stop offset="50%" stopColor="#60CDFF" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="#60CDFF" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="hdoc" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0078D4" stopOpacity="0"/>
          <stop offset="100%" stopColor="#0078D4" stopOpacity="0.3"/>
        </linearGradient>
        <clipPath id="hclip"><circle cx="100" cy="100" r="22"/></clipPath>
        <style>{`
          @keyframes h-pulse  {0%{transform:scale(1)}15%{transform:scale(1.04)}30%{transform:scale(.97)}45%,100%{transform:scale(1)}}
          @keyframes h-scan   {0%{transform:translateY(-44px);opacity:0}20%,80%{opacity:.7}100%{transform:translateY(44px);opacity:0}}
          @keyframes h-float  {0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
          @keyframes h-glow   {0%,100%{opacity:.7}50%{opacity:1}}
          @keyframes h-spin   {from{transform:rotate(0)}to{transform:rotate(360deg)}}
          .h-blades{transform-origin:100px 100px;animation:h-pulse 1.8s cubic-bezier(.17,.17,0,1) both, h-pulse 1.8s cubic-bezier(.17,.17,0,1) 5.8s infinite}
          .h-line  {animation:h-scan 2.4s linear .9s infinite}
          .h-doc   {transform-origin:140px 125px;animation:h-float 3.2s cubic-bezier(.45,0,.55,1) infinite}
          .h-glowc {animation:h-glow 2.8s ease-in-out infinite}
          .h-shld  {transform-origin:100px 100px;animation:h-spin 24s linear infinite}
          @media (prefers-reduced-motion: reduce){.h-blades,.h-line,.h-doc,.h-glowc,.h-shld{animation:none}.h-glowc{opacity:.85}}
        `}</style>
      </defs>
      <g className="h-shld">
        <path d="M 100 55 L 145 72 L 145 122 C 145 148 125 160 100 165 C 75 160 55 148 55 122 L 55 72 Z"
              fill="none" stroke="url(#hsh)" strokeWidth="1.5"/>
      </g>
      <g className="h-blades">
        <g transform="translate(100 100)">
          <g id="hBlade">
            <path d="M0 -60 C 18 -56 30 -40 30 -22 C 30 -6 18 4 0 4 C -14 -6 -22 -18 -22 -34 C -22 -48 -14 -58 0 -60 Z"
                  fill="url(#hb)"/>
            <path d="M0 -60 C -9 -58 -17 -54 -22 -34"
                  stroke="#FFFFFF" strokeOpacity="0.2" strokeWidth="1" fill="none" strokeLinecap="round"/>
          </g>
          <use href="#hBlade" transform="rotate(60)"/>
          <use href="#hBlade" transform="rotate(120)"/>
          <use href="#hBlade" transform="rotate(180)"/>
          <use href="#hBlade" transform="rotate(240)"/>
          <use href="#hBlade" transform="rotate(300)"/>
        </g>
      </g>
      <circle className="h-glowc" cx="100" cy="100" r="24" fill="url(#hg)"/>
      <g clipPath="url(#hclip)">
        <rect className="h-line" x="78" y="99" width="44" height="2" fill="url(#hscan)"/>
      </g>
      <g className="h-doc">
        <g transform="translate(140 125) rotate(15)">
          <rect x="-20" y="-25" width="40" height="50" rx="3" fill="#FFFFFF" fillOpacity="0.9"/>
          <rect x="-20" y="-25" width="40" height="50" rx="3" fill="url(#hdoc)"/>
          <rect x="-12" y="-14" width="24" height="2" fill="#0078D4" fillOpacity="0.6"/>
          <rect x="-12" y="-6"  width="24" height="2" fill="#0078D4" fillOpacity="0.5"/>
          <rect x="-12" y="2"   width="18" height="2" fill="#0078D4" fillOpacity="0.4"/>
        </g>
      </g>
    </svg>
  );
}
