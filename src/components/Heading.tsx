import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function Heading({
  eyebrow,
  children,
  description,
  side = '点击、聆听，慢慢建立直觉',
}: {
  eyebrow: string;
  children: ReactNode;
  description: string;
  side?: string;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{children}</h1>
        <p className="intro">{description}</p>
      </div>
      <div className="heading-side">
        <Icon name="headphones" />
        {side}
      </div>
    </div>
  );
}
