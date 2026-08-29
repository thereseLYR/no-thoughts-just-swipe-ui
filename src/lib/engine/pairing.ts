/**
 * Choosing what to show next.
 *
 * The comparison ANNEALS in dimensionality rather than staying at one axis
 * throughout. Thirty single-axis questions are statistically clean and
 * unbearably dull — every card looks like the last one with slightly rounder
 * corners. So:
 *
 *   Phase 1 "Vibe"   two complete aesthetics. Everything differs. Confounded,
 *                    but it buys a prior across every axis at once, and it is
 *                    the only phase that is actually fun.
 *   Phase 2 "Facet"  one group of related axes moves together (all of colour,
 *                    all of type). Still visibly different, much less noisy.
 *   Phase 3 "Detail" one axis. Now a difference is a question, not a surprise.
 *
 * Within phase 3 the old coarse-to-fine value spacing still applies: early
 * comparisons on a long axis are widely spaced, later ones pit the leader
 * against its closest rival.
 */
import {
  AXES, FACETS, FACET_LABELS, axesInFacet, axis, paramDistance,
  type AxisKey, type DesignParams, type Facet,
} from './params';
import { PRESETS, type Preset } from './presets';
import { bestIndex, isSettled, minAsks, normalizedEntropy, type Beliefs, type Diff } from './scoring';

export const VIBE_SWIPES = 5;
export const FACET_SWIPES = 8;

/** Confidence discount per phase — see recordComparison. */
export const PHASE_WEIGHT = { preset: 0.4, facet: 0.7, axis: 1 } as const;

export type PairKind = keyof typeof PHASE_WEIGHT;

export type Pair = {
  kind: PairKind;
  /** What is being decided, for the header. */
  prompt: string;
  diffs: Diff[];
  a: DesignParams;
  b: DesignParams;
  aLabel: string;
  bLabel: string;
  aBlurb?: string;
  bBlurb?: string;
  /** Dedupe key. */
  id: string;
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

  // Refinement: leader versus its strongest untested rival. Adjacent values are
  // fair game here — that is exactly the tie left to break.
  const anchor = bestIndex(beliefs, key);
  const rivals = unasked
    .filter((p) => p[0] === anchor || p[1] === anchor)
    .map((p) => (p[0] === anchor ? p[1] : p[0]))
    .sort((x, y) => (beliefs.scores[key][y] ?? 0) - (beliefs.scores[key][x] ?? 0));

  if (rivals.length > 0) return [anchor, rivals[0]!];
  return unasked[Math.floor(rng() * unasked.length)]!;
}

function diffsBetween(a: DesignParams, b: DesignParams): Diff[] {
  const out: Diff[] = [];
  for (const def of AXES) {
    if (a[def.key] === b[def.key]) continue;
    const values = def.values as readonly unknown[];
    out.push({
      axis: def.key,
      winnerIdx: values.indexOf(a[def.key]),
      loserIdx: values.indexOf(b[def.key]),
    });
  }
  return out;
}

/** Flip a pair so `a` is the winner's side, for recording. */
export function diffsForWinner(pair: Pair, side: 'a' | 'b'): Diff[] {
  if (side === 'a') return pair.diffs;
  return pair.diffs.map((d) => ({
    axis: d.axis,
    winnerIdx: d.loserIdx,
    loserIdx: d.winnerIdx,
  }));
}

function presetPair(rng: () => number, asked: ReadonlySet<string>): Pair | null {
  const options: Array<{ a: Preset; b: Preset; distance: number; id: string }> = [];
  for (let i = 0; i < PRESETS.length; i++) {
    for (let j = i + 1; j < PRESETS.length; j++) {
      const a = PRESETS[i]!;
      const b = PRESETS[j]!;
      const id = `preset:${a.id}-${b.id}`;
      if (asked.has(id)) continue;
      options.push({ a, b, distance: paramDistance(a.params, b.params), id });
    }
  }
  if (options.length === 0) return null;

  // Sample from the most-different quarter. Pure argmax would show the same
  // two extremes to everyone; pure random would show near-identical pairs.
  options.sort((x, y) => y.distance - x.distance);
  const pool = options.slice(0, Math.max(1, Math.ceil(options.length / 4)));
  const picked = pool[Math.floor(rng() * pool.length)]!;
  const flip = rng() < 0.5;
  const [first, second] = flip ? [picked.b, picked.a] : [picked.a, picked.b];

  return {
    kind: 'preset',
    prompt: 'Which world do you want to live in?',
    diffs: diffsBetween(first.params, second.params),
    a: first.params,
    b: second.params,
    aLabel: first.name,
    bLabel: second.name,
    aBlurb: first.blurb,
    bBlurb: second.blurb,
    id: picked.id,
  };
}

function facetPair(
  beliefs: Beliefs,
  rng: () => number,
  asked: ReadonlySet<string>,
): Pair | null {
  // Least-settled facet first, so the mid-game spends its swipes where the
  // preset phase left the most ambiguity.
  const ranked = [...FACETS].sort(
    (x, y) => facetEntropy(beliefs, y) - facetEntropy(beliefs, x),
  );

  for (const facet of ranked) {
    const base = currentParams(beliefs);
    const a = { ...base };
    const b = { ...base };
    const diffs: Diff[] = [];

    for (const def of axesInFacet(facet)) {
      if (isSettled(beliefs, def.key)) continue;
      const indices = chooseIndices(beliefs, def.key, rng, asked);
      if (!indices) continue;
      const [i, j] = indices;
      (a as Record<AxisKey, unknown>)[def.key] = def.values[i];
      (b as Record<AxisKey, unknown>)[def.key] = def.values[j];
      diffs.push({ axis: def.key, winnerIdx: i, loserIdx: j });
    }

    if (diffs.length === 0) continue;

    const id = `facet:${facet}:${diffs.map((d) => pairKey(d.axis, d.winnerIdx, d.loserIdx)).join('|')}`;
    if (asked.has(id)) continue;

    return {
      kind: 'facet',
      prompt: `${FACET_LABELS[facet]} — which direction?`,
      diffs,
      a,
      b,
      aLabel: describeSide(a, diffs, 'winner'),
      bLabel: describeSide(b, diffs, 'loser'),
      id,
    };
  }
  return null;
}

function facetEntropy(beliefs: Beliefs, facet: Facet): number {
  const axes = axesInFacet(facet);
  return axes.reduce((sum, a) => sum + normalizedEntropy(beliefs, a.key), 0) / axes.length;
}

function describeSide(p: DesignParams, diffs: readonly Diff[], _which: 'winner' | 'loser'): string {
  return diffs
    .slice(0, 3)
    .map((d) => axis(d.axis).describe(p[d.axis] as never))
    .join(' · ');
}

function axisPair(
  beliefs: Beliefs,
  rng: () => number,
  asked: ReadonlySet<string>,
): Pair | null {
  const candidates = AXES.filter((a) => !isSettled(beliefs, a.key)).sort((x, y) => {
    const xShort = beliefs.asks[x.key] < minAsks(x.key) ? 1 : 0;
    const yShort = beliefs.asks[y.key] < minAsks(y.key) ? 1 : 0;
    if (xShort !== yShort) return yShort - xShort;
    return normalizedEntropy(beliefs, y.key) - normalizedEntropy(beliefs, x.key);
  });

  for (const def of candidates) {
    const indices = chooseIndices(beliefs, def.key, rng, asked);
    if (!indices) continue;

    const flip = rng() < 0.5;
    const [i, j] = flip ? [indices[1], indices[0]] : indices;
    const base = currentParams(beliefs);

    return {
      kind: 'axis',
      prompt: `${def.label} — which do you prefer?`,
      diffs: [{ axis: def.key, winnerIdx: i, loserIdx: j }],
      a: { ...base, [def.key]: def.values[i] } as DesignParams,
      b: { ...base, [def.key]: def.values[j] } as DesignParams,
      aLabel: def.describe(def.values[i] as never),
      bLabel: def.describe(def.values[j] as never),
      id: pairKey(def.key, i, j),
    };
  }
  return null;
}

/** Which phase a given swipe number belongs to. */
export function phaseFor(swipes: number): PairKind {
  if (swipes < VIBE_SWIPES) return 'preset';
  if (swipes < VIBE_SWIPES + FACET_SWIPES) return 'facet';
  return 'axis';
}

export function nextPair(
  beliefs: Beliefs,
  swipes: number,
  rng: () => number,
  asked: ReadonlySet<string>,
): Pair | null {
  // Phases degrade forward: if presets run out, fall through to facets, and so
  // on. The session only ends when nothing at all is left to ask.
  const phase = phaseFor(swipes);
  const order: PairKind[] =
    phase === 'preset'
      ? ['preset', 'facet', 'axis']
      : phase === 'facet'
        ? ['facet', 'axis']
        : ['axis'];

  for (const kind of order) {
    const pair =
      kind === 'preset'
        ? presetPair(rng, asked)
        : kind === 'facet'
          ? facetPair(beliefs, rng, asked)
          : axisPair(beliefs, rng, asked);
    if (pair) return pair;
  }
  return null;
}

/**
 * Which slice of a design to actually render for this comparison.
 *
 * The vibe round earns a full page — everything differs, so the gestalt IS the
 * question. Everything after it is scoped to the facet under test, so the
 * difference is the first thing you see rather than something you hunt for.
 */
export function focusFor(pair: Pair): Facet | 'full' {
  if (pair.kind === 'preset') return 'full';
  const first = pair.diffs[0];
  return first ? axis(first.axis).facet : 'full';
}

export function allSettled(beliefs: Beliefs): boolean {
  return AXES.every((a) => isSettled(beliefs, a.key));
}
