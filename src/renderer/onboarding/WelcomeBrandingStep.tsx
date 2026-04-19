import { ShieldCheckmarkFilled } from '@fluentui/react-icons';

/**
 * First onboarding screen — the Vision-EviDex brand. Rendered inside
 * the OnboardingPage card but with its own hero layout: large animated
 * icon, brand name in display type, one-line caption. The card's
 * navigation row (owned by OnboardingPage) renders the Begin button
 * via the "Get Started"-on-first-step branch.
 */

export function WelcomeBrandingStep(): JSX.Element {
  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        textAlign:      'center',
        gap:            'var(--space-4)',
        padding:        'var(--space-4) 0',
      }}
    >
      <div
        className="icon-orb icon-orb-accent icon-orb-96 icon-orb-animated"
        aria-hidden="true"
      >
        <ShieldCheckmarkFilled fontSize={44} />
      </div>

      <div>
        <div
          style={{
            fontFamily: 'var(--font-family-display)',
            fontSize:   'var(--type-title-large-size)',
            fontWeight: 'var(--type-title-large-weight)',
            lineHeight: 'var(--type-title-large-height)',
            color:      'var(--color-text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          Vision
          <span style={{ color: 'var(--color-accent-default)' }}>-EviDex</span>
        </div>
        <p
          style={{
            fontSize:   'var(--type-body-large-size)',
            lineHeight: 'var(--type-body-large-height)',
            color:      'var(--color-text-secondary)',
            margin:     'var(--space-3) auto 0',
            maxWidth:   480,
          }}
        >
          Evidence capture, annotation, and audit-grade reporting — all in one Windows-native app.
        </p>
      </div>
    </div>
  );
}
