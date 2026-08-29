import { describe, it, expect } from 'vitest';
import { inGamut } from 'culori';
import { AXES, axis, defaultParams, type AxisKey, type DesignParams } from './params';
import { PRESETS } from './presets';
import { simulate, distanceTo } from './__testing__/simulatedUser';
import { brandRamp, neutralRamp, contrast, RAMP_STOPS } from './color';
import { buildTokens, resolveInteraction } from './tokens';
import {
  initBeliefs, recordChoice, recordComparison, bestIndex, normalizedEntropy, confidence,
} from './scoring';
import {
  nextPair, mulberry32, diffsForWinner, phaseFor, PHASE_WEIGHT,
  VIBE_SWIPES, FACET_SWIPES,
} from './pairing';
import { encodeParams, decodeParams } from './encode';
import { bundle } from './generators';

const srgb = inGamut('rgb');
const HEX = /^#[0-9a-f]{6}$/;

describe('colour ramps', () => {
  it('emit in-gamut sRGB hex at every stop, for every hue', () => {
    for (const hue of [0, 60, 105, 145, 210, 264, 300]) {
      for (const level of ['muted', 'balanced', 'vivid', 'neon'] as const) {
        const ramp = brandRamp(hue, level);
        for (const stop of RAMP_STOPS) {
          expect(ramp[stop], `hue ${hue} ${level} ${stop}`).toMatch(HEX);
          expect(srgb(ramp[stop]), `hue ${hue} ${level} ${stop} out of gamut`).toBe(true);
        }
      }
    }
  });

  it('descend in lightness monotonically', () => {
    const ramp = brandRamp(264, 'neon');
    const lums = RAMP_STOPS.map((s) => contrast(ramp[s], '#000000'));
    for (let i = 1; i < lums.length; i++) expect(lums[i]).toBeLessThan(lums[i - 1]!);
  });

  it('keep pure neutrals achromatic', () => {
    const ramp = neutralRamp('pure');
    for (const stop of RAMP_STOPS) {
      const [r, g, b] = ramp[stop].slice(1).match(/../g)!.map((h) => parseInt(h, 16));
      expect(Math.max(r!, g!, b!) - Math.min(r!, g!, b!)).toBeLessThanOrEqual(1);
    }
  });
});

describe('token contrast', () => {
  it('clears WCAG AA for body text in both themes, across the whole space', () => {
    for (const a of AXES) {
      for (const value of a.values) {
        const t = buildTokens({ ...defaultParams(), [a.key]: value } as DesignParams);
        expect(contrast(t.color.light.text, t.color.light.bg), `light/${a.key}=${value}`)
          .toBeGreaterThanOrEqual(4.5);
        expect(contrast(t.color.dark.text, t.color.dark.bg), `dark/${a.key}=${value}`)
          .toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('picks an accent foreground that clears AA against the accent', () => {
    for (const hue of [0, 60, 105, 145, 210, 264, 300]) {
      const t = buildTokens({ ...defaultParams(), hue, chroma: 'vivid' });
      expect(contrast(t.color.light.accentFg, t.color.light.accent), `hue ${hue}`)
        .toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('scoring', () => {
  it('moves the favourite toward the winner', () => {
    let b = initBeliefs();
    b = recordChoice(b, 'radius', 4, 0);
    expect(bestIndex(b, 'radius')).toBe(4);
  });

  it('gives ordinal neighbours partial credit but non-ordinal none', () => {
    const ord = recordChoice(initBeliefs(), 'radius', 2, 0);
    expect(ord.scores.radius[3]).toBeGreaterThan(0);

    const nom = recordChoice(initBeliefs(), 'depth', 2, 0);
    expect(nom.scores.depth[3]).toBe(0);
  });

  it('wraps credit around the hue circle', () => {
    const b = recordChoice(initBeliefs(), 'hue', 0, 6);
    expect(b.scores.hue[11]).toBeGreaterThan(0);
  });

  it('reduces entropy as evidence accumulates', () => {
    let b = initBeliefs();
    const before = normalizedEntropy(b, 'depth');
    b = recordChoice(b, 'depth', 1, 0);
    b = recordChoice(b, 'depth', 1, 2);
    expect(normalizedEntropy(b, 'depth')).toBeLessThan(before);
  });

  it('starts at zero confidence', () => {
    expect(confidence(initBeliefs())).toBeCloseTo(0, 5);
  });
});

describe('pairing', () => {
  it('opens with two complete, wildly different aesthetics', () => {
    const pair = nextPair(initBeliefs(), 0, mulberry32(42), new Set());
    expect(pair?.kind).toBe('preset');
    // The whole point of the vibe round: these should not look similar.
    expect(pair!.diffs.length).toBeGreaterThanOrEqual(6);
  });

  it('anneals from presets through facets down to single axes', () => {
    expect(phaseFor(0)).toBe('preset');
    expect(phaseFor(VIBE_SWIPES - 1)).toBe('preset');
    expect(phaseFor(VIBE_SWIPES)).toBe('facet');
    expect(phaseFor(VIBE_SWIPES + FACET_SWIPES)).toBe('axis');
  });

  it('varies only one axis once it reaches the detail phase', () => {
    let beliefs = initBeliefs();
    const rng = mulberry32(3);
    const asked = new Set<string>();
    for (let i = 0; i < VIBE_SWIPES + FACET_SWIPES; i++) {
      const p = nextPair(beliefs, i, rng, asked);
      if (!p) break;
      beliefs = recordComparison(beliefs, p.diffs, PHASE_WEIGHT[p.kind]);
      asked.add(p.id);
    }
    const detail = nextPair(beliefs, VIBE_SWIPES + FACET_SWIPES, rng, asked);
    expect(detail?.kind).toBe('axis');
    expect(detail!.diffs).toHaveLength(1);
    const differing = (Object.keys(detail!.a) as AxisKey[]).filter(
      (k) => detail!.a[k] !== detail!.b[k],
    );
    expect(differing).toEqual([detail!.diffs[0]!.axis]);
  });

  it('discounts confounded comparisons when crediting axes', () => {
    const beliefs = initBeliefs();
    const pair = nextPair(beliefs, 0, mulberry32(9), new Set())!;
    const after = recordComparison(beliefs, pair.diffs, PHASE_WEIGHT.preset);
    const touched = pair.diffs[0]!.axis;
    // A preset swipe buys less than a full observation on any single axis.
    expect(after.asks[touched]).toBeCloseTo(PHASE_WEIGHT.preset, 5);
    expect(after.asks[touched]).toBeLessThan(1);
  });

  it('flips diffs when the right-hand card wins', () => {
    const pair = nextPair(initBeliefs(), 0, mulberry32(11), new Set())!;
    const flipped = diffsForWinner(pair, 'b');
    expect(flipped[0]!.winnerIdx).toBe(pair.diffs[0]!.loserIdx);
    expect(flipped[0]!.loserIdx).toBe(pair.diffs[0]!.winnerIdx);
  });

  it('never repeats a comparison it has already asked', () => {
    let beliefs = initBeliefs();
    const rng = mulberry32(1);
    const asked = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const pair = nextPair(beliefs, i, rng, asked);
      if (!pair) break;
      expect(asked.has(pair.id)).toBe(false);
      asked.add(pair.id);
      beliefs = recordComparison(beliefs, pair.diffs, PHASE_WEIGHT[pair.kind]);
    }
  });

  it('keeps a real gap on long ordinal axes while scanning', () => {
    const rng = mulberry32(7);
    const beliefs = initBeliefs();
    for (let i = 0; i < 30; i++) {
      const pair = nextPair(beliefs, VIBE_SWIPES + FACET_SWIPES, rng, new Set());
      if (!pair || pair.kind !== 'axis') continue;
      const d = pair.diffs[0]!;
      const def = axis(d.axis);
      if (!def.ordinal || def.values.length < 5) continue;
      const len = def.values.length;
      const raw = Math.abs(d.winnerIdx - d.loserIdx);
      expect(def.circular ? Math.min(raw, len - raw) : raw).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('presets', () => {
  it('are all valid points in the parameter space', () => {
    for (const preset of PRESETS) {
      for (const a of AXES) {
        expect(
          (a.values as readonly unknown[]).includes(preset.params[a.key]),
          `${preset.id}.${a.key} = ${String(preset.params[a.key])}`,
        ).toBe(true);
      }
    }
  });

  it('produce accessible palettes despite the loud ones', () => {
    for (const preset of PRESETS) {
      const t = buildTokens(preset.params);
      expect(t.audit.textOnBg, `${preset.id} body text`).toBeGreaterThanOrEqual(4.5);
      expect(t.audit.accentFgOnAccent, `${preset.id} accent label`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('span genuinely different territory', () => {
    // Every preset should differ from every other on at least a third of axes.
    for (let i = 0; i < PRESETS.length; i++) {
      for (let j = i + 1; j < PRESETS.length; j++) {
        const differing = AXES.filter(
          (a) => PRESETS[i]!.params[a.key] !== PRESETS[j]!.params[a.key],
        ).length;
        expect(differing, `${PRESETS[i]!.id} vs ${PRESETS[j]!.id}`).toBeGreaterThanOrEqual(5);
      }
    }
  });
});

describe('interaction', () => {
  it('derives from elevation when set to auto', () => {
    const cases = [
      ['flat', 'tint'], ['bordered', 'tint'], ['soft-shadow', 'lift'],
      ['hard-shadow', 'press'], ['glow', 'glow'],
    ] as const;
    for (const [depth, expected] of cases) {
      const p = { ...defaultParams(), depth, interaction: 'auto' } as DesignParams;
      expect(resolveInteraction(p), depth).toBe(expected);
      expect(buildTokens(p).interaction.style).toBe(expected);
    }
  });

  it('respects an explicit override', () => {
    const p = { ...defaultParams(), depth: 'flat', interaction: 'glow' } as DesignParams;
    expect(resolveInteraction(p)).toBe('glow');
  });

  it('keeps the hover accent readable across the whole space', () => {
    for (const preset of PRESETS) {
      for (const mode of ['light', 'dark'] as const) {
        const c = buildTokens({ ...preset.params, mode }).color[mode];
        expect(contrast(c.accentFg, c.accentHover), `${preset.id}/${mode}`)
          .toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('moves the hover accent away from the surface, never toward it', () => {
    for (const preset of PRESETS) {
      const light = buildTokens({ ...preset.params, mode: 'light' }).color.light;
      // Darker on light themes: more contrast against a light surface, so a
      // hover can never make a control harder to read.
      expect(contrast(light.accentHover, light.surface), preset.id)
        .toBeGreaterThanOrEqual(contrast(light.accent, light.surface) - 0.01);
    }
  });

  it('never costs a swipe', () => {
    let beliefs = initBeliefs();
    const rng = mulberry32(21);
    const asked = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const pair = nextPair(beliefs, i, rng, asked);
      if (!pair) break;
      // The vibe round varies whole presets, but they all share interaction.
      expect(pair.diffs.map((d) => d.axis)).not.toContain('interaction');
      beliefs = recordComparison(beliefs, pair.diffs, PHASE_WEIGHT[pair.kind]);
      asked.add(pair.id);
    }
  });

  it('still round-trips through a share link', () => {
    const p = { ...defaultParams(), interaction: 'press' } as DesignParams;
    const decoded = decodeParams(encodeParams(p));
    expect(decoded.ok && decoded.params.interaction).toBe('press');
  });
});

describe('share seeds', () => {
  it('round-trip losslessly', () => {
    const params: DesignParams = {
      mode: 'dark', hue: 270, chroma: 'neon', neutralTemp: 'warm', accentUsage: 'bold',
      surfaceStyle: 'gradient', depth: 'glow', typePairing: 'terminal', typeScale: 1.333,
      weightContrast: 'extreme', textTransform: 'uppercase', radius: 16,
      borderWeight: 'heavy', density: 'airy', interaction: 'lift',
    };
    const result = decodeParams(encodeParams(params));
    expect(result.ok && result.params).toEqual(params);
  });

  it('snap off-grid values to the nearest candidate, wrapping on hue', () => {
    const near = decodeParams(encodeParams({ ...defaultParams(), hue: 264 }));
    expect(near.ok && near.params.hue).toBe(270);
    const wrapped = decodeParams(encodeParams({ ...defaultParams(), hue: 355 }));
    expect(wrapped.ok && wrapped.params.hue).toBe(0);
  });

  it('stay URL-safe and compact', () => {
    const seed = encodeParams(defaultParams());
    expect(seed).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(seed.length).toBeLessThan(64);
  });

  it('reject garbage without throwing', () => {
    expect(decodeParams('not-a-seed').ok).toBe(false);
    expect(decodeParams('').ok).toBe(false);
  });

  it('reject a seed from a different engine version', () => {
    const wrong = btoa(JSON.stringify([99, ...AXES.map(() => 0)]))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const r = decodeParams(wrong);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toContain('v99');
  });
});

describe('convergence', () => {
  const targets: DesignParams[] = [
    { mode: 'dark', hue: 300, chroma: 'neon', neutralTemp: 'cool', accentUsage: 'bold',
      surfaceStyle: 'gradient', depth: 'glow', typePairing: 'terminal', typeScale: 1.25,
      weightContrast: 'high', textTransform: 'uppercase', radius: 0,
      borderWeight: 'medium', density: 'tight', interaction: 'auto' },
    { mode: 'light', hue: 30, chroma: 'muted', neutralTemp: 'warm', accentUsage: 'subtle',
      surfaceStyle: 'solid', depth: 'flat', typePairing: 'serif-display', typeScale: 1.5,
      weightContrast: 'high', textTransform: 'none', radius: 0,
      borderWeight: 'hairline', density: 'airy', interaction: 'auto' },
    { mode: 'light', hue: 150, chroma: 'balanced', neutralTemp: 'pure', accentUsage: 'bold',
      surfaceStyle: 'tinted', depth: 'hard-shadow', typePairing: 'brutalist', typeScale: 1.333,
      weightContrast: 'extreme', textTransform: 'uppercase', radius: 9999,
      borderWeight: 'heavy', density: 'comfortable', interaction: 'auto' },
  ];

  it('lands close to hidden preferences within the swipe budget', () => {
    for (const [n, target] of targets.entries()) {
      const { params, swipes } = simulate(target, 100 + n);
      // Distance, not exact matches: a confounded vibe round trades some
      // per-axis precision for a far better opening experience.
      const distance = distanceTo(target, params);
      expect(distance, `target ${n} distance in ${swipes} swipes`).toBeLessThan(4);
      expect(swipes, `target ${n} swipe count`).toBeLessThanOrEqual(26);
    }
  });

  it('beats a random point in the space', () => {
    const target = targets[0]!;
    const learned = distanceTo(target, simulate(target, 7).params);
    const naive = distanceTo(target, defaultParams());
    expect(learned).toBeLessThan(naive);
  });

  it('is deterministic for a given seed', () => {
    expect(simulate(targets[0]!, 5).params).toEqual(simulate(targets[0]!, 5).params);
  });
});

describe('bundle', () => {
  it('emits every expected file with content', () => {
    const files = bundle(defaultParams());
    const paths = files.map((f) => f.path);
    expect(paths).toContain('app.css');
    expect(paths).toContain('tokens.json');
    expect(paths).toContain('README.md');
    expect(paths.filter((p) => p.startsWith('components/'))).toHaveLength(4);
    for (const f of files) expect(f.contents.length).toBeGreaterThan(50);
  });

  it('produces parseable DTCG JSON', () => {
    const json = bundle(defaultParams()).find((f) => f.path === 'tokens.json')!;
    const parsed = JSON.parse(json.contents);
    expect(parsed.color.brand['500'].$type).toBe('color');
  });

  it('emits hover as tokens rather than hardcoded shades', () => {
    const files = bundle(defaultParams());
    const css = files.find((f) => f.path === 'app.css')!.contents;
    expect(css).toContain('--color-accent-hover');
    expect(css).toContain('--shadow-hover');
    expect(css).toContain('--hover-transform');
    expect(css).toContain('prefers-reduced-motion');

    const button = files.find((f) => f.path === 'components/Button.tsx')!.contents;
    expect(button).toContain('hover:bg-accent-hover');
    expect(button).not.toMatch(/hover:bg-brand-\d/);
  });

  it('namespaces theme vars so it will not clobber Tailwind defaults', () => {
    const css = bundle(defaultParams()).find((f) => f.path === 'app.css')!.contents;
    expect(css).toContain('--color-brand-500');
    expect(css).not.toMatch(/--color-(blue|red|green|slate|gray)-500:/);
  });
});
