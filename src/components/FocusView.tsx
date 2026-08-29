import type { CSSProperties } from 'react';
import { Button, Preview, heading, stage, surface } from './Preview';
import { buildTokens } from '@/lib/engine/tokens';
import { RAMP_STOPS } from '@/lib/engine/color';
import type { DesignParams, Facet } from '@/lib/engine/params';

/**
 * Show only what is actually changing.
 *
 * A full page mock is the right comparison when everything differs — that is
 * the vibe round, where the whole point is the gestalt. It is the wrong one
 * when a single axis moved: asking someone to spot four pixels of border radius
 * across a nav, a hero, two cards and a form is a search task, not a taste
 * judgement. Each facet gets a view that puts its axes centre stage.
 */
export type Focus = Facet | 'full';

const centred: CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: 'var(--ds-space-lg)',
};

function TypeFocus() {
  return (
    <div style={centred}>
      {/* 3xl, not 4xl: at a 1.5 ratio the display step is ~121px, which wraps
          to two lines and pushes the rest of the specimen off the card. */}
      <div style={{ ...heading, fontSize: 'var(--ds-text-3xl)', margin: 0 }}>Ship faster</div>
      <div style={{ ...heading, fontSize: 'var(--ds-text-xl)', margin: 0 }}>
        Built for teams
      </div>
      <p
        style={{
          color: 'var(--ds-text-muted)',
          fontSize: 'var(--ds-text-base)',
          margin: 0,
          maxWidth: '40ch',
        }}
      >
        Everything your team needs to plan, build, and launch.
      </p>
      <span
        style={{
          fontFamily: 'var(--ds-font-mono)',
          fontSize: 'var(--ds-text-xs)',
          color: 'var(--ds-text-muted)',
        }}
      >
        v2.1.0 — 14 Aug
      </span>
    </div>
  );
}

function PaletteFocus({ params }: { params: DesignParams }) {
  const tokens = buildTokens(params);
  return (
    <div style={centred}>
      <div style={{ display: 'flex', width: '100%', height: 64 }}>
        {RAMP_STOPS.map((stop) => (
          <div key={stop} style={{ flex: 1, background: tokens.color.brand[stop] }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 'var(--ds-space-md)', alignItems: 'center' }}>
        <Button>Get started</Button>
        <Button kind="ghost">Learn more</Button>
        <span
          style={{
            display: 'inline-flex',
            padding: 'var(--ds-space-xs) var(--ds-space-md)',
            borderRadius: '9999px',
            background: 'var(--ds-accent-subtle)',
            color: 'var(--ds-accent)',
            fontSize: 'var(--ds-text-xs)',
            fontWeight: 500,
          }}
        >
          New
        </span>
      </div>
      <div>
        <div style={{ ...heading, fontSize: 'var(--ds-text-xl)' }}>Body and muted</div>
        <p style={{ color: 'var(--ds-text-muted)', fontSize: 'var(--ds-text-base)', margin: 0 }}>
          Secondary text sits here, one step back from the headline.
        </p>
      </div>
    </div>
  );
}

function SurfaceFocus() {
  return (
    <div style={{ ...centred, justifyContent: 'center' }}>
      <div style={{ ...surface, padding: 'var(--ds-space-xl)' }}>
        <div style={{ ...heading, fontSize: 'var(--ds-text-2xl)' }}>Analytics</div>
        <p
          style={{
            color: 'var(--ds-text-muted)',
            fontSize: 'var(--ds-text-base)',
            margin: 'var(--ds-space-sm) 0 var(--ds-space-lg)',
          }}
        >
          Track what matters, ignore what doesn't.
        </p>
        <Button>Open dashboard</Button>
      </div>
    </div>
  );
}

function ShapeFocus() {
  return (
    <div style={centred}>
      <div style={{ display: 'flex', gap: 'var(--ds-space-md)', alignItems: 'center' }}>
        <Button>Get started</Button>
        <Button kind="ghost">Cancel</Button>
      </div>
      <div
        style={{
          background: 'var(--ds-surface)',
          border: 'var(--ds-border-width) solid var(--ds-border)',
          borderRadius: 'var(--ds-radius-md)',
          padding: 'var(--ds-space-sm) var(--ds-space-md)',
          fontSize: 'var(--ds-text-base)',
          color: 'var(--ds-text-muted)',
        }}
      >
        you@company.com
      </div>
      <div style={{ ...surface, padding: 'var(--ds-space-lg)' }}>
        <div style={{ ...heading, fontSize: 'var(--ds-text-lg)' }}>Card</div>
        <p
          style={{
            color: 'var(--ds-text-muted)',
            fontSize: 'var(--ds-text-sm)',
            margin: 'var(--ds-space-xs) 0 0',
          }}
        >
          Corners, rules, and the air between things.
        </p>
      </div>
    </div>
  );
}

export function FocusView({
  params,
  focus,
  theme,
  compact = true,
}: {
  params: DesignParams;
  focus: Focus;
  theme?: 'light' | 'dark';
  compact?: boolean;
}) {
  if (focus === 'full') return <Preview params={params} theme={theme} compact={compact} />;

  const tokens = buildTokens(params);
  return (
    <div style={stage(tokens, theme)}>
      {focus === 'type' && <TypeFocus />}
      {focus === 'palette' && <PaletteFocus params={params} />}
      {focus === 'surface' && <SurfaceFocus />}
      {focus === 'shape' && <ShapeFocus />}
    </div>
  );
}
