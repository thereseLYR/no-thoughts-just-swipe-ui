import { describe, it, expect } from 'vitest';
import { inGamut } from 'culori';
import { AXES, axis, defaultParams, type AxisKey, type DesignParams } from './params';
import { brandRamp, neutralRamp, contrast, RAMP_STOPS } from './color';
import { buildTokens } from './tokens';
import {
  initBeliefs, recordChoice, bestIndex, normalizedEntropy, paramsFromBeliefs, confidence,
} from './scoring';
import { nextPair, mulberry32, pairKey } from './pairing';
import { encodeParams, decodeParams } from './encode';
import { bundle } from './generators';

const srgb = inGamut('rgb');
const HEX = /^#[0-9a-f]{6}$/;

describe('colour ramps', () => {
  it('emit in-gamut sRGB hex at every stop, for every hue', () => {
    for (const hue of [0, 60, 105, 145, 210, 264, 300]) {
      for (const level of ['muted', 'balanced', 'vivid'] as const) {
        const ramp = brandRamp(hue, level);
        for (const stop of RAMP_STOPS) {
          expect(ramp[stop], `hue ${hue} ${level} ${stop}`).toMatch(HEX);
          expect(srgb(ramp[stop]), `hue ${hue} ${level} ${stop} out of gamut`).toBe(true);
        }
      }
    }
  });

  it('descend in lightness monotonically', () => {
    const ramp = brandRamp(264, 'vivid');
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
  it('varies exactly one axis between the two cards', () => {
    const pair = nextPair(initBeliefs(), 0, mulberry32(42), new Set());
    expect(pair).not.toBeNull();
    const differing = (Object.keys(pair!.a) as AxisKey[]).filter((k) => pair!.a[k] !== pair!.b[k]);
    expect(differing).toEqual([pair!.axis]);
  });

  it('keeps a real gap on long ordinal axes', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 50; i++) {
      const pair = nextPair(initBeliefs(), 2, rng, new Set());
      if (!pair) continue;
      const def = axis(pair.axis);
      if (!def.ordinal || def.values.length < 4) continue;
      const len = def.values.length;
      const raw = Math.abs(pair.aIndex - pair.bIndex);
      const gap = def.circular ? Math.min(raw, len - raw) : raw;
      expect(gap).toBeGreaterThanOrEqual(2);
    }
  });

  it('never repeats a pair it has already asked', () => {
    let beliefs = initBeliefs();
    const rng = mulberry32(1);
    const asked = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const pair = nextPair(beliefs, 0, rng, asked);
      if (!pair) break;
      const key = pairKey(pair.axis, pair.aIndex, pair.bIndex);
      expect(asked.has(key)).toBe(false);
      asked.add(key);
      beliefs = recordChoice(beliefs, pair.axis, pair.aIndex, pair.bIndex);
    }
  });

  it('returns null once a stage is settled', () => {
    let b = initBeliefs();
    for (let i = 0; i < 30; i++) {
      b = recordChoice(b, 'depth', 1, 0);
      b = recordChoice(b, 'accentUsage', 1, 0);
    }
    expect(nextPair(b, 3, mulberry32(3), new Set())).toBeNull();
  });
});

describe('share seeds', () => {
  it('round-trip losslessly', () => {
    const params: DesignParams = {
      hue: 270, chroma: 'vivid', neutralTemp: 'warm', radius: 16, density: 'airy',
      typePairing: 'serif-display', typeScale: 1.333, depth: 'hard-shadow',
      weightContrast: 'high', accentUsage: 'bold',
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
  /** A user with fixed hidden taste always picks the option nearer their target. */
  function simulate(target: DesignParams, seed: number) {
    let beliefs = initBeliefs();
    const rng = mulberry32(seed);
    const asked = new Set<string>();
    let swipes = 0;

    for (let stage = 0; stage < 4; stage++) {
      for (let guard = 0; guard < 40; guard++) {
        const pair = nextPair(beliefs, stage, rng, asked);
        if (!pair) break;
        const def = axis(pair.axis);
        const want = (def.values as readonly unknown[]).indexOf(target[pair.axis]);
        const len = def.values.length;
        const dist = (i: number) => {
          const raw = Math.abs(i - want);
          return def.circular ? Math.min(raw, len - raw) : raw;
        };
        const [win, lose] =
          dist(pair.aIndex) <= dist(pair.bIndex)
            ? [pair.aIndex, pair.bIndex]
            : [pair.bIndex, pair.aIndex];
        beliefs = recordChoice(beliefs, pair.axis, win, lose);
        asked.add(pairKey(pair.axis, pair.aIndex, pair.bIndex));
        swipes++;
      }
    }
    return { params: paramsFromBeliefs(beliefs), swipes, confidence: confidence(beliefs) };
  }

  const targets: DesignParams[] = [
    { hue: 264, chroma: 'vivid', neutralTemp: 'cool', radius: 16, density: 'airy',
      typePairing: 'geometric', typeScale: 1.333, depth: 'soft-shadow',
      weightContrast: 'high', accentUsage: 'bold' },
    { hue: 30, chroma: 'muted', neutralTemp: 'warm', radius: 0, density: 'tight',
      typePairing: 'serif-display', typeScale: 1.125, depth: 'hard-shadow',
      weightContrast: 'low', accentUsage: 'subtle' },
    { hue: 150, chroma: 'balanced', neutralTemp: 'pure', radius: 9999, density: 'comfortable',
      typePairing: 'mono-accent', typeScale: 1.2, depth: 'flat',
      weightContrast: 'high', accentUsage: 'bold' },
  ];

  it('recovers hidden preferences in a reasonable number of swipes', () => {
    for (const [n, target] of targets.entries()) {
      const { params, swipes } = simulate(target, 100 + n);
      const matched = AXES.filter((a) => params[a.key] === target[a.key]).length;
      expect(matched / AXES.length, `target ${n}: ${matched}/${AXES.length} in ${swipes}`)
        .toBeGreaterThanOrEqual(0.8);
      expect(swipes, `target ${n} swipe count`).toBeLessThanOrEqual(40);
    }
  });

  it('is deterministic for a given seed', () => {
    const a = simulate(targets[0]!, 5);
    const b = simulate(targets[0]!, 5);
    expect(a).toEqual(b);
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

  it('namespaces theme vars so it will not clobber Tailwind defaults', () => {
    const css = bundle(defaultParams()).find((f) => f.path === 'app.css')!.contents;
    expect(css).toContain('--color-brand-500');
    expect(css).not.toMatch(/--color-(blue|red|green|slate|gray)-500:/);
  });
});
