import { forwardRef, type HTMLAttributes } from 'react';

export type CardVariant = 'default' | 'elevated' | 'highlighted';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const VARIANT_CLASS: Record<CardVariant, string> = {
  default:     'card',
  elevated:    'card-elevated',
  highlighted: 'card-highlighted',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'default', className, children, ...rest },
  ref
) {
  return (
    <div ref={ref} className={`${VARIANT_CLASS[variant]} ${className ?? ''}`.trim()} {...rest}>
      {children}
    </div>
  );
});

export function CardDivider(): JSX.Element {
  return <hr className="card-divider" aria-hidden="true" />;
}
