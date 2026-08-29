import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STAGE_COUNT, type AxisKey, type DesignParams } from '@/lib/engine/params';
import {
  initBeliefs, recordChoice, paramsFromBeliefs, confidence, withAxis, type Beliefs,
} from '@/lib/engine/scoring';
import { mulberry32, nextPair, pairKey, type Pair } from '@/lib/engine/pairing';

type Snapshot = { beliefs: Beliefs; stage: number; asked: string[]; current: Pair | null };

type SessionState = {
  seed: number;
  beliefs: Beliefs;
  stage: number;
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

/** Walk forward through stages until a pair appears or the session is done. */
function advance(beliefs: Beliefs, stage: number, seed: number, swipes: number, asked: string[]) {
  const set = new Set(asked);
  for (let s = stage; s < STAGE_COUNT; s++) {
    const pair = nextPair(beliefs, s, rngFor(seed, swipes), set);
    if (pair) return { stage: s, current: pair, done: false };
  }
  return { stage: STAGE_COUNT, current: null, done: true };
}

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      seed: 1,
      beliefs: initBeliefs(),
      stage: 0,
      asked: [],
      swipes: 0,
      current: null,
      done: false,
      overrides: {},
      history: [],

      start: (seed = Math.floor(Math.random() * 1e9)) => {
        const beliefs = initBeliefs();
        const next = advance(beliefs, 0, seed, 0, []);
        set({ seed, beliefs, asked: [], swipes: 0, overrides: {}, history: [], ...next });
      },

      choose: (side) => {
        const { current, beliefs, asked, seed, swipes, stage, history } = get();
        if (!current) return;

        const [winner, loser] =
          side === 'a' ? [current.aIndex, current.bIndex] : [current.bIndex, current.aIndex];

        const snapshot: Snapshot = { beliefs, stage, asked, current };
        const nextBeliefs = recordChoice(beliefs, current.axis, winner, loser);
        const nextAsked = [...asked, pairKey(current.axis, current.aIndex, current.bIndex)];
        const nextSwipes = swipes + 1;

        set({
          beliefs: nextBeliefs,
          asked: nextAsked,
          swipes: nextSwipes,
          history: [...history, snapshot],
          ...advance(nextBeliefs, stage, seed, nextSwipes, nextAsked),
        });
      },

      undo: () => {
        const { history, swipes } = get();
        const previous = history.at(-1);
        if (!previous) return;
        set({
          beliefs: previous.beliefs,
          stage: previous.stage,
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

      progress: () => confidence(get().beliefs),
    }),
    {
      name: 'nts-session',
      // `current` is derived; recompute it on rehydrate rather than trusting
      // a stored pair that may predate an engine change.
      partialize: (s) => ({
        seed: s.seed, beliefs: s.beliefs, stage: s.stage, asked: s.asked,
        swipes: s.swipes, overrides: s.overrides, done: s.done,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const next = advance(state.beliefs, state.stage, state.seed, state.swipes, state.asked);
        Object.assign(state, next, { history: [] });
      },
    },
  ),
);
