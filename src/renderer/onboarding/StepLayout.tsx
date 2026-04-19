import type { ComponentType, ReactNode } from 'react';
import type { FluentIconsProps } from '@fluentui/react-icons';

/**
 * Shared centred layout for every onboarding step: an animated gradient
 * icon orb at the top, then a heading, a subtext, and a content slot.
 * Keeps each step file focused on its form controls rather than on
 * re-declaring the same header scaffold.
 */

type FluentIcon = ComponentType<FluentIconsProps>;

export type OrbPalette = 'accent' | 'success' | 'warm' | 'cool' | 'violet';
export type OrbSize = 56 | 72 | 96;

export interface StepLayoutProps {
  icon: FluentIcon;
  palette?: OrbPalette;
  size?: OrbSize;
  title: string;
  subtext?: string;
  children?: ReactNode;
  /** Max-width of the content column (default 560). */
  maxWidth?: number;
}

export function StepLayout({
  icon: Icon,
  palette = 'accent',
  size = 72,
  title,
  subtext,
  children,
  maxWidth = 560,
}: StepLayoutProps): JSX.Element {
  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        textAlign:      'center',
        gap:            'var(--space-4)',
        maxWidth,
        margin:         '0 auto',
      }}
    >
      <div
        className={`icon-orb icon-orb-${palette} icon-orb-${size} icon-orb-animated`}
        aria-hidden="true"
      >
        <Icon fontSize={Math.round(size * 0.5)} />
      </div>

      <div>
        <h1
          style={{
            fontFamily: 'var(--font-family-display)',
            fontSize:   'var(--type-title-size)',
            fontWeight: 'var(--type-title-weight)',
            lineHeight: 'var(--type-title-height)',
            color:      'var(--color-text-primary)',
            margin:     0,
          }}
        >
          {title}
        </h1>
        {subtext && (
          <p
            style={{
              fontSize:  'var(--type-body-size)',
              color:     'var(--color-text-secondary)',
              margin:    'var(--space-2) auto 0',
              maxWidth:  480,
            }}
          >
            {subtext}
          </p>
        )}
      </div>

      {children && <div style={{ width: '100%', marginTop: 'var(--space-3)' }}>{children}</div>}
    </div>
  );
}
