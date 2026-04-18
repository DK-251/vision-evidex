import type { HTMLAttributes } from 'react';

export type StatusTagKind = 'pass' | 'fail' | 'blocked' | 'skip' | 'untagged' | 'suspect';

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tag: StatusTagKind;
  label?: string;
}

const DEFAULT_LABEL: Record<StatusTagKind, string> = {
  pass:     'Pass',
  fail:     'Fail',
  blocked:  'Blocked',
  skip:     'Skip',
  untagged: 'Untagged',
  suspect:  'Suspect',
};

export function StatusBadge({ tag, label, className, children, ...rest }: StatusBadgeProps): JSX.Element {
  return (
    <span className={`status-badge ${tag} ${className ?? ''}`.trim()} {...rest}>
      {children ?? label ?? DEFAULT_LABEL[tag]}
    </span>
  );
}
