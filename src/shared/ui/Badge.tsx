import type { HTMLAttributes } from 'react';

type Tone = 'neutral' | 'blue' | 'success' | 'warning' | 'danger';

export function Badge({
  tone = 'neutral',
  className = '',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={`badge badge--${tone} ${className}`} {...props} />;
}
