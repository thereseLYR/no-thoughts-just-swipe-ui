/**
 * Test-only. A user with fixed hidden taste, used to measure convergence.
 *
 * Multi-axis comparisons make this more interesting than "pick the nearer
 * value": faced with two whole aesthetics, the simulated user scores each side
 * across every axis and picks the closer one overall — which is exactly the
 * confounded signal the engine has to cope with in the vibe round.
 */
import { AXES, axis, type DesignParams } from '../params';
import {
  confidence, paramsFromBeliefs, initBeliefs, recordComparison, type Beliefs,
} from '../scoring';
import { diffsForWinner, mulberry32, nextPair, PHASE_WEIGHT } from '../pairing';

function axisDistance(key: (typeof AXES)[number]['key'], a: unknown, b: unknown): number {
  const def = axis(key);
  const values = def.values as readonly unknown[];
  const i = values.indexOf(a);
  const j = values.indexOf(b);
  if (i === -1 || j === -1) return 1;
  if (!def.ordinal) return i === j ? 0 : 1;
  const len = values.length;
  const raw = Math.abs(i - j);
  const d = def.circular ? Math.min(raw, len - raw) : raw;
  return d / (def.circular ? len / 2 : len - 1);
}

/** Total mismatch between a candidate and the hidden target, 0 = identical. */
export function distanceTo(target: DesignParams, candidate: DesignParams): number {
  return AXES.reduce((sum, a) => sum + axisDistance(a.key, target[a.key], candidate[a.key]), 0);
}

export type SimResult = {
  params: DesignParams;
  swipes: number;
  confidence: number;
  beliefs: Beliefs;
};

export function simulate(target: DesignParams, seed: number, maxSwipes = 26): SimResult {
  let beliefs = initBeliefs();
  const asked = new Set<string>();
  let swipes = 0;

  while (swipes < maxSwipes) {
    const pair = nextPair(beliefs, swipes, mulberry32(seed * 7919 + swipes), asked);
    if (!pair) break;
    const side = distanceTo(target, pair.a) <= distanceTo(target, pair.b) ? 'a' : 'b';
    beliefs = recordComparison(beliefs, diffsForWinner(pair, side), PHASE_WEIGHT[pair.kind]);
    asked.add(pair.id);
    swipes++;
  }

  return {
    params: paramsFromBeliefs(beliefs),
    swipes,
    confidence: confidence(beliefs),
    beliefs,
  };
}
