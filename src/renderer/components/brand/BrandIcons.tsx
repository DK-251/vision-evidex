import type { CSSProperties, ComponentType } from 'react';
import type { FluentIconsProps } from '@fluentui/react-icons';

/**
 * Vision-EviDex brand icon set. Inline React-SVG twins of the
 * authoritative `build/icons/*.svg` files (the `.svg` files are
 * the packaging source of truth; these are what the renderer
 * actually imports). Each step-icon component matches the
 * `@fluentui/react-icons` props shape so it is a drop-in for
 * the `StepLayout.icon` prop (typed as `FluentIcon`).
 */

type BrandIconProps = FluentIconsProps;
type GlyphProps = { size: number };
export type BrandIcon = ComponentType<BrandIconProps>;

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

/* ─── Primary aperture + gradient defs (reused) ─────────────────── */

function Defs({ id }: { id: string }): JSX.Element {
  return (
    <defs>
      <linearGradient id={`${id}-bl`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0078D4"/>
        <stop offset="100%" stopColor="#00B4D8"/>
      </linearGradient>
      <linearGradient id={`${id}-tick`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0078D4"/>
        <stop offset="100%" stopColor="#6B2FBA"/>
      </linearGradient>
    </defs>
  );
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

/* ─── 8 step icons — 32×32 — accept FluentIconsProps ────────────── */

function Step({ children, props }: { children: (g: GlyphProps) => JSX.Element; props: BrandIconProps }): JSX.Element {
  const size = sizeOf(props);
  return (
    <svg {...svgProps(props)} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <Defs id={`s${size}`}/>
      {children({ size })}
    </svg>
  );
}

export function StepActivate(props: BrandIconProps): JSX.Element {
  const id = `s${sizeOf(props)}`;
  return (
    <Step props={props}>{() => (
      <g stroke={`url(#${id}-bl)`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" transform="rotate(45 16 16)">
        <circle cx="10" cy="16" r="5" fill={`url(#${id}-bl)`} fillOpacity="0.15"/>
        <circle cx="10" cy="16" r="5"/>
        <path d="M 10 13.5 H 12"/>
        <path d="M 10 18.5 H 12"/>
        <path d="M 15 16 H 26"/>
        <path d="M 19 16 V 19"/>
        <path d="M 22 16 V 19"/>
        <path d="M 25 16 V 19"/>
      </g>
    )}</Step>
  );
}

export function StepWelcome(props: BrandIconProps): JSX.Element {
  const id = `s${sizeOf(props)}`;
  return (
    <Step props={props}>{() => (
      <>
        <path d="M 16 4 L 18 14 L 28 16 L 18 18 L 16 28 L 14 18 L 4 16 L 14 14 Z"
              fill={`url(#${id}-bl)`} stroke={`url(#${id}-bl)`} strokeWidth="1.5" strokeLinejoin="round"/>
        <g opacity="0.4" fill={`url(#${id}-bl)`}>
          <path d="M 5 6 L 5.6 8 L 7.5 8.5 L 5.6 9 L 5 11 L 4.4 9 L 2.5 8.5 L 4.4 8 Z"/>
          <path d="M 27 24 L 27.6 26 L 29.5 26.5 L 27.6 27 L 27 29 L 26.4 27 L 24.5 26.5 L 26.4 26 Z"/>
        </g>
      </>
    )}</Step>
  );
}

export function StepProfile(props: BrandIconProps): JSX.Element {
  const id = `s${sizeOf(props)}`;
  return (
    <Step props={props}>{() => (
      <>
        <circle cx="16" cy="11" r="5" fill={`url(#${id}-bl)`}/>
        <path d="M 6 27 C 6 20 10 17 16 17 C 22 17 26 20 26 27"
              fill="none" stroke={`url(#${id}-bl)`} strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="21.5" cy="14.5" r="4" fill={`url(#${id}-bl)`} stroke="#FFFFFF" strokeWidth="1"/>
        <path d="M 19.8 14.5 L 21 15.7 L 23.2 13.3"
              fill="none" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </>
    )}</Step>
  );
}

export function StepBranding(props: BrandIconProps): JSX.Element {
  const id = `s${sizeOf(props)}`;
  return (
    <Step props={props}>{() => (
      <>
        <g stroke={`url(#${id}-bl)`} strokeWidth="1.5" strokeLinejoin="round" fill="none">
          <rect x="5"  y="12" width="6"  height="14" rx="1"/>
          <rect x="13" y="7"  width="6"  height="19" rx="1"/>
          <rect x="21" y="14" width="6"  height="12" rx="1"/>
        </g>
        <g transform="translate(24 22)">
          <circle r="4" fill={`url(#${id}-bl)`}/>
          <circle r="1" cx="-1.5" cy="-1" fill="#FFFFFF" opacity="0.9"/>
          <circle r="1" cx="1.5"  cy="-1" fill="#FFFFFF" opacity="0.7"/>
          <circle r="1" cx="0"    cy="1.5" fill="#FFFFFF" opacity="0.8"/>
        </g>
      </>
    )}</Step>
  );
}

export function StepTemplate(props: BrandIconProps): JSX.Element {
  const id = `s${sizeOf(props)}`;
  return (
    <Step props={props}>{() => (
      <>
        <rect x="5" y="4" width="22" height="24" rx="2"
              fill="none" stroke={`url(#${id}-bl)`} strokeWidth="1.5" strokeLinejoin="round"/>
        <rect x="7" y="6" width="18" height="5" rx="1" fill={`url(#${id}-bl)`}/>
        <rect x="7"  y="13" width="8" height="13" rx="1" fill="none" stroke={`url(#${id}-bl)`} strokeWidth="1.5"/>
        <rect x="17" y="13" width="8" height="13" rx="1" fill="none" stroke={`url(#${id}-bl)`} strokeWidth="1.5"/>
        <g transform="translate(26 6)">
          <path d="M 0 -3 L 0.9 -1 L 3 -0.7 L 1.4 0.8 L 1.9 3 L 0 1.8 L -1.9 3 L -1.4 0.8 L -3 -0.7 L -0.9 -1 Z"
                fill={`url(#${id}-bl)`} stroke={`url(#${id}-bl)`} strokeWidth="0.5" strokeLinejoin="round"/>
        </g>
      </>
    )}</Step>
  );
}

export function StepHotkeys(props: BrandIconProps): JSX.Element {
  const id = `s${sizeOf(props)}`;
  return (
    <Step props={props}>{() => (
      <>
        <rect x="3" y="9" width="26" height="17" rx="2.5"
              fill="none" stroke={`url(#${id}-bl)`} strokeWidth="1.5" strokeLinejoin="round"/>
        <g fill="none" stroke={`url(#${id}-bl)`} strokeWidth="1.3">
          <circle cx="8"  cy="14" r="1"/><circle cx="14" cy="14" r="1"/><circle cx="20" cy="14" r="1"/>
          <circle cx="7"  cy="18" r="1"/><circle cx="11" cy="18" r="1"/><circle cx="15" cy="18" r="1"/><circle cx="19" cy="18" r="1"/>
          <circle cx="8"  cy="22" r="1"/><circle cx="14" cy="22" r="1"/><circle cx="20" cy="22" r="1"/>
        </g>
        <path d="M 26 6 L 21 16 L 25 16 L 22 27 L 29 14 L 25 14 Z"
              fill={`url(#${id}-bl)`} stroke={`url(#${id}-bl)`} strokeWidth="1" strokeLinejoin="round"/>
      </>
    )}</Step>
  );
}

export function StepAppearance(props: BrandIconProps): JSX.Element {
  const id = `s${sizeOf(props)}`;
  const clipL = `s${sizeOf(props)}-cl`;
  const clipR = `s${sizeOf(props)}-cr`;
  return (
    <svg {...svgProps(props)} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <Defs id={id}/>
      <defs>
        <clipPath id={clipL}><rect x="0" y="0" width="16" height="32"/></clipPath>
        <clipPath id={clipR}><rect x="16" y="0" width="16" height="32"/></clipPath>
      </defs>
      <g clipPath={`url(#${clipL})`}>
        <circle cx="16" cy="16" r="10" fill={`url(#${id}-bl)`}/>
        <circle cx="19" cy="14" r="9" fill="var(--color-layer-1)"/>
      </g>
      <g clipPath={`url(#${clipR})`} stroke={`url(#${id}-bl)`} strokeWidth="1.5" strokeLinecap="round" fill="none">
        <circle cx="16" cy="16" r="5" fill={`url(#${id}-bl)`}/>
        <path d="M 16 5 V 8"/>
        <path d="M 16 24 V 27"/>
        <path d="M 27 16 H 24"/>
        <path d="M 23.8 8.2 L 21.7 10.3"/>
        <path d="M 23.8 23.8 L 21.7 21.7"/>
      </g>
      <line x1="16" y1="4" x2="16" y2="28" stroke={`url(#${id}-bl)`} strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

export function StepComplete(props: BrandIconProps): JSX.Element {
  const id = `s${sizeOf(props)}`;
  return (
    <Step props={props}>{() => (
      <>
        <circle cx="16" cy="16" r="10" fill="none" stroke={`url(#${id}-bl)`} strokeWidth="1.5"/>
        <path d="M 11 16.5 L 14.4 19.7 L 21 13 L 22.2 14.3 L 14.5 22 L 9.8 17.7 Z"
              fill={`url(#${id}-tick)`} stroke={`url(#${id}-tick)`} strokeWidth="0.4" strokeLinejoin="round"/>
        <g stroke={`url(#${id}-bl)`} strokeWidth="1.5" strokeLinecap="round" opacity="0.6">
          <path d="M 25 7  L 27.8 4.2"/>
          <path d="M 7  7  L 4.2 4.2"/>
          <path d="M 25 25 L 27.8 27.8"/>
          <path d="M 7  25 L 4.2 27.8"/>
        </g>
      </>
    )}</Step>
  );
}
