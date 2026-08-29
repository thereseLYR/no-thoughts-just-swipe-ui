/**
 * Belief state over the parameter space.
 *
 * Each axis holds one score per candidate value. A comparison rewards the
 * winner and penalises the loser, and on ordinal axes that credit bleeds into
 * neighbouring values — so "8px beat 0px" also says something about 4px. That
 * kernel is what lets a 5-value axis converge in ~3 comparisons instead of 5.
 *
 * Scores alone are not enough to call an axis settled. One comparison sharpens
 * the softmax enough to look confident while carrying almost no information, so
 * we also require a minimum number of observations before an axis can retire.
 */
import { AXES, axis, type AxisKey, type DesignParams } from './params';

export type Beliefs = {
  scores: Record<AxisKey, number[]>;
  /** Fractional: a confounded multi-axis comparison is worth less than a
   *  targeted one, so it buys each axis only part of an observation. */
  asks: Record<AxisKey, number>;
};

/** One axis's contribution to a comparison. */
export type Diff = { axis: AxisKey; winnerIdx: number; loserIdx: number };

const WIN = 1;
const LOSS = -0.6;
/** Softmax sharpness. Higher = more decisive, converges faster, less forgiving. */
const BETA = 1.4;
/** Below this normalised entropy an axis counts as settled. */
export const SETTLED = 0.72;

/** Distinct comparisons an axis can offer before it starts repeating itself. */
export function availablePairs(key: AxisKey): number {
  const n = axis(key).values.length;
  return (n * (n - 1)) / 2;
}

/**
 * Comparisons needed before an axis may retire. log2(n) is the information
 * floor; the +1 pays for the coarse scan that pairing.ts runs first. Capped by
 * how many distinct pairs actually exist — a binary axis is decided in one.
 */
export function minAsks(key: AxisKey): number {
  const n = axis(key).values.length;
  const wanted = n <= 3 ? 2 : Math.ceil(Math.log2(n)) + 1;
  return Math.max(1, Math.min(wanted, availablePairs(key)));
}

export function initBeliefs(): Beliefs {
  const scores = {} as Record<AxisKey, number[]>;
  const asks = {} as Record<AxisKey, number>;
  for (const a of AXES) {
    scores[a.key] = new Array<number>(a.values.length).fill(0);
    asks[a.key] = 0;
  }
  return { scores, asks };
}

/** Index distance, wrapping for circular axes like hue. */
function distance(i: number, j: number, len: number, circular: boolean): number {
  const raw = Math.abs(i - j);
  return circular ? Math.min(raw, len - raw) : raw;
}

function kernel(d: number, ordinal: boolean): number {
  if (!ordinal) return d === 0 ? 1 : 0;
  return Math.exp(-(d ** 2) / 2);
}

/**
 * Apply one comparison across every axis that differed.
 *
 * `weight` is the confidence discount. Choosing between two complete aesthetics
 * says something about all twelve axes that differ, but it does not say which
 * of them drove the choice — so each gets a fraction of a full observation.
 * A single-axis comparison is unconfounded and gets the full weight.
 */
export function recordComparison(beliefs: Beliefs, diffs: readonly Diff[], weight = 1): Beliefs {
  const scores = { ...beliefs.scores };
  const asks = { ...beliefs.asks };

  for (const { axis: key, winnerIdx, loserIdx } of diffs) {
    const a = axis(key);
    const len = a.values.length;
    const circular = a.circular ?? false;
    const next = [...beliefs.scores[key]];

    for (let i = 0; i < len; i++) {
      next[i] =
        (next[i] ?? 0) +
        weight *
          (WIN * kernel(distance(i, winnerIdx, len, circular), a.ordinal) +
            LOSS * kernel(distance(i, loserIdx, len, circular), a.ordinal));
    }

    scores[key] = next;
    asks[key] = (asks[key] ?? 0) + weight;
  }

  return { scores, asks };
}

/** Single-axis convenience wrapper — an unconfounded comparison. */
export function recordChoice(
  beliefs: Beliefs,
  key: AxisKey,
  winnerIdx: number,
  loserIdx: number,
): Beliefs {
  return recordComparison(beliefs, [{ axis: key, winnerIdx, loserIdx }], 1);
}

export function distribution(beliefs: Beliefs, key: AxisKey): number[] {
  const scores = beliefs.scores[key];
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(BETA * (s - max)));
  const total = exps.reduce((x, y) => x + y, 0);
  return exps.map((e) => e / total);
}

export function bestIndex(beliefs: Beliefs, key: AxisKey): number {
  const scores = beliefs.scores[key];
  let best = 0;
  for (let i = 1; i < scores.length; i++) if (scores[i]! > scores[best]!) best = i;
  return best;
}

/** 1 = no information yet, 0 = fully decided. */
export function normalizedEntropy(beliefs: Beliefs, key: AxisKey): number {
  const p = distribution(beliefs, key);
  if (p.length <= 1) return 0;
  const h = -p.reduce((sum, x) => (x > 0 ? sum + x * Math.log(x) : sum), 0);
  return h / Math.log(p.length);
}

export function isSettled(beliefs: Beliefs, key: AxisKey): boolean {
  // Nothing left to ask means nothing left to learn, whatever the entropy says.
  if (beliefs.asks[key] >= availablePairs(key)) return true;
  if (beliefs.asks[key] < minAsks(key)) return false;
  return normalizedEntropy(beliefs, key) < SETTLED;
}

/**
 * Progress for the UI. Blends how much has been asked with how decided the
 * answers are, so the bar moves on every swipe rather than jumping at the end.
 */
export function confidence(beliefs: Beliefs): number {
  const parts = AXES.map((a) => {
    const asked = Math.min(1, beliefs.asks[a.key] / minAsks(a.key));
    const decided = 1 - normalizedEntropy(beliefs, a.key);
    return 0.5 * asked + 0.5 * decided;
  });
  return parts.reduce((x, y) => x + y, 0) / parts.length;
}

export function paramsFromBeliefs(beliefs: Beliefs): DesignParams {
  const out = {} as Record<AxisKey, unknown>;
  for (const a of AXES) out[a.key] = a.values[bestIndex(beliefs, a.key)];
  return out as DesignParams;
}

/** Replace one axis value, for the fine-tune step on the results screen. */
export function withAxis<K extends AxisKey>(
  params: DesignParams,
  key: K,
  value: DesignParams[K],
): DesignParams {
  return { ...params, [key]: value };
}
