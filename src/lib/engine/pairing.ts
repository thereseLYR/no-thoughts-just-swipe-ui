/**
 * Choosing what to show next.
 *
 * Three rules do the work:
 *
 *   1. Vary exactly ONE axis between the two cards, holding everything else at
 *      the current best estimate. If the cards differ in three ways, the answer
 *      tells you nothing about which difference drove it.
 *
 *   2. Ask about the axis you know least about. Not just the single highest-
 *      entropy one though — if its pairs are exhausted, fall through to the
 *      next, or a two-value axis stalls the whole stage after one swipe.
 *
 *   3. Go coarse to fine. Early comparisons on a long axis are widely spaced,
 *      to map the space; later ones pit the leader against its closest rival,
 *      to break the tie. Always anchoring on the incumbent traps you at
 *      whatever value you happened to start from.
 */
import { AXES, axis, type AxisKey, type DesignParams } from './params';
import { bestIndex, isSettled, minAsks, normalizedEntropy, type Beliefs } from './scoring';

export type Pair = {
  axis: AxisKey;
  aIndex: number;
  bIndex: number;
  a: DesignParams;
  b: DesignParams;
};

/** Seeded PRNG, so a session is reproducible from its seed alone. */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function pairKey(key: AxisKey, i: number, j: number): string {
  return `${key}:${Math.min(i, j)}-${Math.max(i, j)}`;
}

function currentParams(beliefs: Beliefs): DesignParams {
  const out = {} as Record<AxisKey, unknown>;
  for (const a of AXES) out[a.key] = a.values[bestIndex(beliefs, a.key)];
  return out as DesignParams;
}

/** Every axis in this stage has enough signal — move on. */
export function stageComplete(beliefs: Beliefs, stage: number): boolean {
  return AXES.filter((a) => a.stage === stage).every((a) => isSettled(beliefs, a.key));
}

function gap(i: number, j: number, len: number, circular: boolean): number {
  const raw = Math.abs(i - j);
  return circular ? Math.min(raw, len - raw) : raw;
}

/** How many scan comparisons an axis gets before switching to refinement. */
function scanBudget(len: number): number {
  return len >= 5 ? Math.floor(len / 4) : 0;
}

/** Pick two indices for one axis, or null if every pair has been asked. */
function chooseIndices(
  beliefs: Beliefs,
  key: AxisKey,
  rng: () => number,
  asked: ReadonlySet<string>,
): [number, number] | null {
  const def = axis(key);
  const len = def.values.length;
  const circular = def.circular ?? false;

  const unasked: Array<[number, number]> = [];
  for (let i = 0; i < len; i++) {
    for (let j = i + 1; j < len; j++) {
      if (!asked.has(pairKey(key, i, j))) unasked.push([i, j]);
    }
  }
  if (unasked.length === 0) return null;

  // Coarse phase: widely separated pairs, chosen without reference to the
  // incumbent, so a bad starting guess cannot anchor the whole axis.
  if (beliefs.asks[key] < scanBudget(len)) {
    const ideal = circular ? len / 2 : len - 1;
    let best = Infinity;
    const shortlist: Array<[number, number]> = [];
    for (const pair of unasked) {
      const score = Math.abs(gap(pair[0], pair[1], len, circular) - ideal);
      if (score < best) {
        best = score;
        shortlist.length = 0;
      }
      if (score === best) shortlist.push(pair);
    }
    return shortlist[Math.floor(rng() * shortlist.length)]!;
  }

  // Refinement phase: leader versus its strongest untested rival. Adjacent
  // values are fair game here — that is exactly the tie left to break.
  const anchor = bestIndex(beliefs, key);
  const rivals = unasked
    .filter((p) => p[0] === anchor || p[1] === anchor)
    .map((p) => (p[0] === anchor ? p[1] : p[0]))
    .sort((x, y) => (beliefs.scores[key][y] ?? 0) - (beliefs.scores[key][x] ?? 0));

  if (rivals.length > 0) return [anchor, rivals[0]!];

  // Leader has faced everyone. Take any remaining pair to keep learning.
  return unasked[Math.floor(rng() * unasked.length)]!;
}

export function nextPair(
  beliefs: Beliefs,
  stage: number,
  rng: () => number,
  asked: ReadonlySet<string>,
): Pair | null {
  const candidates = AXES.filter((a) => a.stage === stage && !isSettled(beliefs, a.key)).sort(
    (x, y) => {
      // Axes still short of their minimum go first; then least-known first.
      const xShort = beliefs.asks[x.key] < minAsks(x.key) ? 1 : 0;
      const yShort = beliefs.asks[y.key] < minAsks(y.key) ? 1 : 0;
      if (xShort !== yShort) return yShort - xShort;
      return normalizedEntropy(beliefs, y.key) - normalizedEntropy(beliefs, x.key);
    },
  );

  for (const def of candidates) {
    const indices = chooseIndices(beliefs, def.key, rng, asked);
    if (!indices) continue;

    // Randomise which side the favourite lands on, or users learn to always
    // swipe the same direction.
    const flip = rng() < 0.5;
    const aIndex = flip ? indices[1] : indices[0];
    const bIndex = flip ? indices[0] : indices[1];

    const base = currentParams(beliefs);
    return {
      axis: def.key,
      aIndex,
      bIndex,
      a: { ...base, [def.key]: def.values[aIndex] } as DesignParams,
      b: { ...base, [def.key]: def.values[bIndex] } as DesignParams,
    };
  }

  return null;
}
