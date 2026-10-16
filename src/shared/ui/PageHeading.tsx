import type { ReactNode } from 'react';

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
  visual,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  visual?: ReactNode;
}) {
  return (
    <header className={`page-heading ${visual ? 'page-heading--visual' : ''}`}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-heading__description">{description}</p>
      </div>
      {visual && (
        <div className="page-heading__visual" aria-hidden="true">
          {visual}
        </div>
      )}
      {action}
    </header>
  );
}
