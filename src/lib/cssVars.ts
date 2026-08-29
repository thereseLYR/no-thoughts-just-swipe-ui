import type { CSSProperties } from 'react';
import type { DesignTokens } from './engine/tokens';

/**
 * Tokens reach previews as CSS custom properties on a wrapper element, never as
 * rebuilt Tailwind classes. That is what lets two swipe cards render identical
 * markup under different token sets, and makes the fine-tune step instant.
 */
export function toCssVars(t: DesignTokens, theme: 'light' | 'dark' = 'light'): CSSProperties {
  const semantic = t.color[theme];
  const vars: Record<string, string> = {
    '--ds-bg': semantic.bg,
    '--ds-surface': semantic.surface,
    '--ds-border': semantic.border,
    '--ds-text': semantic.text,
    '--ds-text-muted': semantic.textMuted,
    '--ds-accent': semantic.accent,
    '--ds-accent-fg': semantic.accentFg,
    '--ds-accent-subtle': semantic.accentSubtle,
    '--ds-radius-sm': t.radius.sm,
    '--ds-radius-md': t.radius.md,
    '--ds-radius-lg': t.radius.lg,
    '--ds-shadow-sm': t.shadow.sm,
    '--ds-shadow-md': t.shadow.md,
    '--ds-border-width': t.borderWidth,
    '--ds-font-heading': `"${t.type.heading}", ui-sans-serif, system-ui, sans-serif`,
    '--ds-font-body': `"${t.type.body}", ui-sans-serif, system-ui, sans-serif`,
    '--ds-font-mono': `"${t.type.mono}", ui-monospace, monospace`,
    '--ds-weight-heading': String(t.type.weight.heading),
    '--ds-leading': t.type.leading.normal,
    '--ds-leading-tight': t.type.leading.tight,
  };
  for (const [k, v] of Object.entries(t.spacing)) vars[`--ds-space-${k}`] = v;
  for (const [k, v] of Object.entries(t.type.scale)) vars[`--ds-text-${k}`] = v;
  return vars as CSSProperties;
}
