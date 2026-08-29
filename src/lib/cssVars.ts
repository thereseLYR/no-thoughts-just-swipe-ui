import type { CSSProperties } from 'react';
import type { DesignTokens } from './engine/tokens';

/**
 * Tokens reach previews as CSS custom properties on a wrapper element, never as
 * rebuilt Tailwind classes. That is what lets two swipe cards render identical
 * markup under different token sets, and makes the fine-tune step instant.
 */
export function toCssVars(t: DesignTokens, theme?: 'light' | 'dark'): CSSProperties {
  // A system that leads with dark should preview dark unless asked otherwise.
  const semantic = t.color[theme ?? t.mode];
  const vars: Record<string, string> = {
    '--ds-bg': semantic.bg,
    '--ds-bg-image': semantic.bgImage ?? 'none',
    '--ds-surface': semantic.surface,
    '--ds-border': semantic.border,
    '--ds-text': semantic.text,
    '--ds-text-muted': semantic.textMuted,
    '--ds-accent': semantic.accent,
    '--ds-accent-fg': semantic.accentFg,
    '--ds-accent-subtle': semantic.accentSubtle,
    '--ds-accent-hover': semantic.accentHover,
    '--ds-surface-hover': semantic.surfaceHover,
    '--ds-hover-shadow': t.interaction.shadow,
    '--ds-hover-transform': t.interaction.transform,
    '--ds-transition': t.interaction.transition,
    '--ds-radius-sm': t.radius.sm,
    '--ds-radius-md': t.radius.md,
    '--ds-radius-lg': t.radius.lg,
    '--ds-shadow-sm': t.shadow.sm,
    '--ds-shadow-md': t.shadow.md,
    '--ds-border-width': t.borderWidth,
    '--ds-font-heading': t.type.stacks.heading,
    '--ds-font-body': t.type.stacks.body,
    '--ds-font-mono': t.type.stacks.mono,
    '--ds-weight-heading': String(t.type.weight.heading),
    '--ds-leading': t.type.leading.normal,
    '--ds-leading-tight': t.type.leading.tight,
    '--ds-transform': t.type.transform,
    '--ds-tracking': t.type.tracking,
  };
  for (const [k, v] of Object.entries(t.spacing)) vars[`--ds-space-${k}`] = v;
  for (const [k, v] of Object.entries(t.type.scale)) vars[`--ds-text-${k}`] = v;
  return vars as CSSProperties;
}
