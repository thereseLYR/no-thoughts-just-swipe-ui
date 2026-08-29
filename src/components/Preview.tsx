import type { CSSProperties } from 'react';
import { buildTokens } from '@/lib/engine/tokens';
import { toCssVars } from '@/lib/cssVars';
import type { DesignParams } from '@/lib/engine/params';

/**
 * A mock product screen rendered entirely from --ds-* custom properties.
 *
 * Both swipe cards render this same markup; only the wrapper's variables
 * differ. That is what keeps a comparison honest — whatever the user reacts to
 * is the axis under test, not a layout difference.
 */

const surface: CSSProperties = {
  background: 'var(--ds-surface)',
  border: 'var(--ds-border-width) solid var(--ds-border)',
  borderRadius: 'var(--ds-radius-lg)',
  boxShadow: 'var(--ds-shadow-md)',
};

const heading: CSSProperties = {
  fontFamily: 'var(--ds-font-heading)',
  fontWeight: 'var(--ds-weight-heading)' as unknown as number,
  lineHeight: 'var(--ds-leading-tight)',
  color: 'var(--ds-text)',
};

function Button({ children, kind = 'primary' }: { children: string; kind?: 'primary' | 'ghost' }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: 'var(--ds-space-sm) var(--ds-space-lg)',
        borderRadius: 'var(--ds-radius-md)',
        fontSize: 'var(--ds-text-sm)',
        fontWeight: 500,
        fontFamily: 'var(--ds-font-body)',
        boxShadow: kind === 'primary' ? 'var(--ds-shadow-sm)' : 'none',
        background: kind === 'primary' ? 'var(--ds-accent)' : 'var(--ds-accent-subtle)',
        color: kind === 'primary' ? 'var(--ds-accent-fg)' : 'var(--ds-accent)',
        border:
          kind === 'primary'
            ? 'var(--ds-border-width) solid transparent'
            : 'var(--ds-border-width) solid var(--ds-border)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

export function Preview({
  params,
  theme = 'light',
  compact = false,
}: {
  params: DesignParams;
  theme?: 'light' | 'dark';
  compact?: boolean;
}) {
  const tokens = buildTokens(params);

  return (
    <div
      style={{
        ...toCssVars(tokens, theme),
        background: 'var(--ds-bg)',
        color: 'var(--ds-text)',
        fontFamily: 'var(--ds-font-body)',
        lineHeight: 'var(--ds-leading)',
        padding: 'var(--ds-space-xl)',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* nav */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--ds-space-xl)',
        }}
      >
        <div style={{ ...heading, fontSize: 'var(--ds-text-lg)' }}>Acme</div>
        <div style={{ display: 'flex', gap: 'var(--ds-space-md)', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--ds-text-sm)', color: 'var(--ds-text-muted)' }}>
            Docs
          </span>
          <Button kind="primary">Sign up</Button>
        </div>
      </div>

      {/* hero */}
      <h1 style={{ ...heading, fontSize: compact ? 'var(--ds-text-2xl)' : 'var(--ds-text-3xl)' }}>
        Ship faster
      </h1>
      <p
        style={{
          color: 'var(--ds-text-muted)',
          fontSize: 'var(--ds-text-base)',
          margin: 'var(--ds-space-sm) 0 var(--ds-space-lg)',
          maxWidth: '38ch',
        }}
      >
        Everything your team needs to plan, build, and launch.
      </p>

      <div style={{ display: 'flex', gap: 'var(--ds-space-md)', marginBottom: 'var(--ds-space-xl)' }}>
        <Button>Get started</Button>
        <Button kind="ghost">Learn more</Button>
      </div>

      {/* card + form */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compact ? '1fr' : '1fr 1fr',
          gap: 'var(--ds-space-lg)',
        }}
      >
        <div style={{ ...surface, padding: 'var(--ds-space-lg)' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: 'var(--ds-space-xs) var(--ds-space-md)',
              borderRadius: '9999px',
              background: 'var(--ds-accent-subtle)',
              color: 'var(--ds-accent)',
              fontSize: 'var(--ds-text-xs)',
              fontWeight: 500,
              marginBottom: 'var(--ds-space-sm)',
            }}
          >
            New
          </div>
          <div style={{ ...heading, fontSize: 'var(--ds-text-lg)' }}>Analytics</div>
          <p
            style={{
              color: 'var(--ds-text-muted)',
              fontSize: 'var(--ds-text-sm)',
              marginTop: 'var(--ds-space-xs)',
            }}
          >
            Track what matters, ignore what doesn't.
          </p>
        </div>

        {!compact && (
          <div style={{ ...surface, padding: 'var(--ds-space-lg)' }}>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--ds-text-sm)',
                marginBottom: 'var(--ds-space-xs)',
                color: 'var(--ds-text)',
              }}
            >
              Email
            </label>
            <div
              style={{
                background: 'var(--ds-bg)',
                border: 'var(--ds-border-width) solid var(--ds-border)',
                borderRadius: 'var(--ds-radius-md)',
                padding: 'var(--ds-space-sm) var(--ds-space-md)',
                fontSize: 'var(--ds-text-sm)',
                color: 'var(--ds-text-muted)',
                marginBottom: 'var(--ds-space-md)',
              }}
            >
              you@company.com
            </div>
            <Button>Subscribe</Button>
          </div>
        )}
      </div>
    </div>
  );
}
