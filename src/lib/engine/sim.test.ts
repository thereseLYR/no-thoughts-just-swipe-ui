import { it, expect } from 'vitest';
import { AXES, type AxisKey, type DesignParams } from './params';
import { mulberry32 } from './pairing';
import { simulate, distanceTo } from './__testing__/simulatedUser';

/**
 * Aggregate quality gate over 300 random hidden preferences. Guards against
 * tuning changes (BETA, SETTLED, minAsks, phase lengths, PHASE_WEIGHT) that
 * look harmless on one case but quietly wreck convergence.
 *
 * The metric is distance, not exact matches. The vibe round is deliberately
 * confounded — it trades some per-axis precision for an opening that is
 * actually worth swiping through — so demanding exact recovery would be
 * measuring the wrong thing.
 */
it('converges across the whole parameter space', () => {
  const rows: Array<{ distance: number; swipes: number; naive: number }> = [];

  for (let trial = 0; trial < 300; trial++) {
    const pick = mulberry32(trial * 977 + 13);
    const target = {} as Record<AxisKey, unknown>;
    for (const a of AXES) target[a.key] = a.values[Math.floor(pick() * a.values.length)];
    const t = target as DesignParams;

    const result = simulate(t, trial + 1);

    // Baseline: a random point in the space, for the same target.
    const randomPoint = {} as Record<AxisKey, unknown>;
    for (const a of AXES) randomPoint[a.key] = a.values[Math.floor(pick() * a.values.length)];

    rows.push({
      distance: distanceTo(t, result.params),
      swipes: result.swipes,
      naive: distanceTo(t, randomPoint as DesignParams),
    });
  }

  const mean = (f: (r: (typeof rows)[0]) => number) =>
    rows.reduce((s, r) => s + f(r), 0) / rows.length;
  const distances = rows.map((r) => r.distance).sort((a, b) => a - b);
  const swipes = rows.map((r) => r.swipes).sort((a, b) => a - b);
  const beatsRandom = rows.filter((r) => r.distance < r.naive).length / rows.length;

  expect(mean((r) => r.distance)).toBeLessThan(mean((r) => r.naive) * 0.65);
  expect(beatsRandom).toBeGreaterThan(0.9);
  expect(mean((r) => r.swipes)).toBeLessThanOrEqual(26);

  console.log(`trials         ${rows.length}`);
  console.log(
    `distance  mean ${mean((r) => r.distance).toFixed(2)}  p50 ${distances[150]!.toFixed(2)}` +
      `  worst ${distances.at(-1)!.toFixed(2)}  (random baseline ${mean((r) => r.naive).toFixed(2)})`,
  );
  console.log(`swipes    mean ${mean((r) => r.swipes).toFixed(1)}  min ${swipes[0]}  max ${swipes.at(-1)}`);
  console.log(`beats random   ${(beatsRandom * 100).toFixed(1)}%`);
});
