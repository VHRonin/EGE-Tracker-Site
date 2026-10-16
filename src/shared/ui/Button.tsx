import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Appearance = {
  variant?: Variant;
  className?: string;
  children: ReactNode;
};

function classes(variant: Variant, className = '') {
  return `button button--${variant} ${className}`;
}

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & Appearance) {
  return (
    <button className={classes(variant, className)} type={type} {...props} />
  );
}

export function ButtonLink({
  variant = 'primary',
  className,
  ...props
}: ComponentProps<typeof Link> & Appearance) {
  return <Link className={classes(variant, className)} {...props} />;
}
