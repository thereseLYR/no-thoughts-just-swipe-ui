/**
 * Component sources emitted as strings.
 *
 * These reference only the utility names the @theme block creates
 * (bg-accent, rounded-md, shadow-md...), so the CSS file and these components
 * cannot drift apart.
 */
import type { DesignTokens } from '../tokens';
import type { DesignParams } from '../params';

export type GeneratedFile = { path: string; contents: string; language: string };

function buttonSource(p: DesignParams): string {
  const border = p.depth === 'bordered' || p.depth === 'hard-shadow';
  return `import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

// Hover is part of the token set, not a hardcoded shade: --shadow-hover,
// --hover-transform and --interactive-transition all come from app.css, and
// --interactive-transition already resolves to none under reduced motion.
const base =
  'inline-flex items-center justify-center gap-sm font-medium rounded-md ' +
  'px-lg py-sm text-base focus-visible:outline-2 ' +
  'focus-visible:outline-offset-2 focus-visible:outline-accent ' +
  'disabled:opacity-50 disabled:pointer-events-none ' +
  '[transition:var(--interactive-transition)] ' +
  'hover:[box-shadow:var(--shadow-hover)] hover:[transform:var(--hover-transform)]';

const variants = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover shadow-md${border ? ' border-2 border-neutral-900' : ''}',
  secondary: 'bg-surface text-text border border-border hover:bg-surface-hover',
  ghost: 'bg-transparent text-accent hover:bg-accent-subtle',
};

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  return <button className={\`\${base} \${variants[variant]} \${className}\`} {...props} />;
}
`;
}

function cardSource(p: DesignParams): string {
  const elevation =
    p.depth === 'flat' ? '' : p.depth === 'bordered' ? ' border-2 border-border' : ' shadow-md';
  return `import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={\`bg-surface text-text rounded-lg p-xl border border-border${elevation} \${className}\`}
    >
      {children}
    </div>
  );
}
`;
}

const INPUT_SOURCE = `import type { InputHTMLAttributes } from 'react';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={\`w-full bg-surface text-text placeholder:text-text-muted border border-border
        rounded-md px-md py-sm text-base transition-colors
        focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent
        \${className}\`}
      {...props}
    />
  );
}
`;

const BADGE_SOURCE = `import type { ReactNode } from 'react';

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-accent-subtle text-accent px-md py-xs text-xs font-medium">
      {children}
    </span>
  );
}
`;

export function generateComponents(_t: DesignTokens, p: DesignParams): GeneratedFile[] {
  return [
    { path: 'components/Button.tsx', contents: buttonSource(p), language: 'tsx' },
    { path: 'components/Card.tsx', contents: cardSource(p), language: 'tsx' },
    { path: 'components/Input.tsx', contents: INPUT_SOURCE, language: 'tsx' },
    { path: 'components/Badge.tsx', contents: BADGE_SOURCE, language: 'tsx' },
  ];
}
