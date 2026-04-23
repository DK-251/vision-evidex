import { OnboardingHero } from '../components/brand/BrandIcons';

/**
 * First onboarding screen — the Vision-EviDex brand. Renders the
 * animated Fluent brand mark (aperture + shield + document + scan
 * line) as the hero, followed by the brand name and one-line caption.
 * The card's navigation row (owned by OnboardingPage) renders the
 * Begin button via the first-step branch.
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
      <OnboardingHero size={120} />

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
