import { it, expect } from 'vitest';
import { AXES, axis, type DesignParams, type AxisKey } from './params';
import { initBeliefs, recordChoice, paramsFromBeliefs } from './scoring';
import { nextPair, mulberry32, pairKey } from './pairing';

/**
 * Aggregate quality gate over 300 random hidden preferences. Guards against
 * tuning changes (BETA, SETTLED, minAsks, the scan budget) that look harmless
 * on one case but quietly wreck convergence or balloon the swipe count.
 */
it('converges across the whole parameter space', () => {
  const rows: Array<{ acc: number; swipes: number }> = [];
  for (let trial = 0; trial < 300; trial++) {
    const rng0 = mulberry32(trial * 977 + 13);
    const target = {} as Record<AxisKey, unknown>;
    for (const a of AXES) target[a.key] = a.values[Math.floor(rng0() * a.values.length)];
    const t = target as DesignParams;

    let b = initBeliefs(); const rng = mulberry32(trial + 1); const asked = new Set<string>();
    let swipes = 0;
    for (let stage = 0; stage < 4; stage++) {
      for (let g = 0; g < 60; g++) {
        const pair = nextPair(b, stage, rng, asked);
        if (!pair) break;
        const def = axis(pair.axis);
        const want = (def.values as readonly unknown[]).indexOf(t[pair.axis]);
        const len = def.values.length;
        const d = (i: number) => { const r = Math.abs(i - want); return def.circular ? Math.min(r, len - r) : r; };
        const [w, l] = d(pair.aIndex) <= d(pair.bIndex) ? [pair.aIndex, pair.bIndex] : [pair.bIndex, pair.aIndex];
        b = recordChoice(b, pair.axis, w, l);
        asked.add(pairKey(pair.axis, pair.aIndex, pair.bIndex));
        swipes++;
      }
    }
    const got = paramsFromBeliefs(b);
    rows.push({ acc: AXES.filter((a) => got[a.key] === t[a.key]).length / AXES.length, swipes });
  }
  const mean = (f: (r: typeof rows[0]) => number) => rows.reduce((s, r) => s + f(r), 0) / rows.length;
  const swipes = rows.map((r) => r.swipes).sort((a, b) => a - b);
  const accs = rows.map((r) => r.acc).sort((a, b) => a - b);
  const exact = rows.filter((r) => r.acc === 1).length / rows.length;
  const overEighty = rows.filter((r) => r.acc >= 0.8).length / rows.length;

  expect(mean((r) => r.acc)).toBeGreaterThan(0.9);
  expect(overEighty).toBeGreaterThanOrEqual(0.99);
  expect(exact).toBeGreaterThan(0.4);
  // Session length is a product constraint, not just an engine one.
  expect(mean((r) => r.swipes)).toBeLessThan(34);
  expect(swipes.at(-1)!).toBeLessThanOrEqual(40);

  console.log(`trials            ${rows.length}`);
  console.log(`swipes  mean ${mean((r) => r.swipes).toFixed(1)}  min ${swipes[0]}  p50 ${swipes[150]}  max ${swipes.at(-1)}`);
  console.log(`accuracy mean ${(mean((r) => r.acc) * 100).toFixed(1)}%  p10 ${(accs[30]! * 100).toFixed(0)}%  worst ${(accs[0]! * 100).toFixed(0)}%`);
  console.log(`exact (10/10)  ${((rows.filter((r) => r.acc === 1).length / rows.length) * 100).toFixed(0)}%`);
  console.log(`>=80%          ${(overEighty * 100).toFixed(1)}%`);
});
