import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type AxisKey, type DesignParams } from '@/lib/engine/params';
import {
  initBeliefs, recordComparison, paramsFromBeliefs, confidence, withAxis, type Beliefs,
} from '@/lib/engine/scoring';
import {
  allSettled, diffsForWinner, mulberry32, nextPair, phaseFor, PHASE_WEIGHT,
  VIBE_SWIPES, FACET_SWIPES, type Pair,
} from '@/lib/engine/pairing';

/** Hard stop. Past this the marginal swipe is not worth the attention. */
const MAX_SWIPES = 26;

type Snapshot = { beliefs: Beliefs; asked: string[]; current: Pair | null };

type SessionState = {
  seed: number;
  beliefs: Beliefs;
  /** Sets do not survive JSON persistence, so this is an array. */
  asked: string[];
  swipes: number;
  current: Pair | null;
  done: boolean;
  /** Manual tweaks from the results screen, layered over the learned params. */
  overrides: Partial<DesignParams>;
  history: Snapshot[];

  start: (seed?: number) => void;
  choose: (side: 'a' | 'b') => void;
  undo: () => void;
  override: <K extends AxisKey>(key: K, value: DesignParams[K]) => void;
  clearOverrides: () => void;
  params: () => DesignParams;
  progress: () => number;
  phase: () => 'preset' | 'facet' | 'axis';
};

/**
 * Resolve learned beliefs plus manual overrides into concrete params.
 *
 * Exported as a free function, not just a store method: a selector that returns
 * `params()` builds a new object on every render, which zustand's snapshot
 * comparison reads as a perpetual change. Components memoise this instead.
 */
export function resolveParams(beliefs: Beliefs, overrides: Partial<DesignParams>): DesignParams {
  return Object.entries(overrides).reduce(
    (p, [k, v]) => withAxis(p, k as AxisKey, v as never),
    paramsFromBeliefs(beliefs),
  );
}

/**
 * A fresh PRNG per swipe, derived from seed + swipe count, rather than one
 * long-lived generator. Stateless, so it survives persistence and rehydration
 * without having to replay the whole session to restore generator position.
 */
function rngFor(seed: number, swipes: number) {
  return mulberry32(seed * 7919 + swipes);
}

/**
 * Produce the next comparison, or end the session.
 *
 * The vibe and facet phases always run to completion — they are the interesting
 * part, and cutting them short to save swipes trades the whole experience for a
 * marginal gain in precision. Only the detail phase stops early.
 */
function advance(beliefs: Beliefs, seed: number, swipes: number, asked: string[]) {
  const minimum = VIBE_SWIPES + FACET_SWIPES;
  if (swipes >= MAX_SWIPES || (swipes >= minimum && allSettled(beliefs))) {
    return { current: null, done: true };
  }
  const pair = nextPair(beliefs, swipes, rngFor(seed, swipes), new Set(asked));
  return pair ? { current: pair, done: false } : { current: null, done: true };
}

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      seed: 1,
      beliefs: initBeliefs(),
      asked: [],
      swipes: 0,
      current: null,
      done: false,
      overrides: {},
      history: [],

      start: (seed = Math.floor(Math.random() * 1e9)) => {
        const beliefs = initBeliefs();
        const next = advance(beliefs, seed, 0, []);
        set({ seed, beliefs, asked: [], swipes: 0, overrides: {}, history: [], ...next });
      },

      choose: (side) => {
        const { current, beliefs, asked, seed, swipes, history } = get();
        if (!current) return;

        const snapshot: Snapshot = { beliefs, asked, current };
        const nextBeliefs = recordComparison(
          beliefs,
          diffsForWinner(current, side),
          PHASE_WEIGHT[current.kind],
        );
        const nextAsked = [...asked, current.id];
        const nextSwipes = swipes + 1;

        set({
          beliefs: nextBeliefs,
          asked: nextAsked,
          swipes: nextSwipes,
          history: [...history, snapshot],
          ...advance(nextBeliefs, seed, nextSwipes, nextAsked),
        });
      },

      undo: () => {
        const { history, swipes } = get();
        const previous = history.at(-1);
        if (!previous) return;
        set({
          beliefs: previous.beliefs,
          asked: previous.asked,
          current: previous.current,
          swipes: Math.max(0, swipes - 1),
          done: false,
          history: history.slice(0, -1),
        });
      },

      override: (key, value) =>
        set((s) => ({ overrides: { ...s.overrides, [key]: value } })),

      clearOverrides: () => set({ overrides: {} }),

      params: () => resolveParams(get().beliefs, get().overrides),

      progress: () => {
        const { beliefs, swipes } = get();
        // Blend belief confidence with raw progress through the scripted
        // phases, or the bar sits near zero through the whole vibe round.
        const scripted = Math.min(1, swipes / (VIBE_SWIPES + FACET_SWIPES));
        return Math.max(confidence(beliefs), scripted * 0.6);
      },

      phase: () => phaseFor(get().swipes),
    }),
    {
      name: 'nts-session',
      // `current` is derived; recompute it on rehydrate rather than trusting
      // a stored pair that may predate an engine change.
      partialize: (s) => ({
        seed: s.seed, beliefs: s.beliefs, asked: s.asked,
        swipes: s.swipes, overrides: s.overrides, done: s.done,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const next = advance(state.beliefs, state.seed, state.swipes, state.asked);
        Object.assign(state, next, { history: [] });
      },
    },
  ),
);
