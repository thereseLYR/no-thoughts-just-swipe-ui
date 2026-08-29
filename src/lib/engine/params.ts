/**
 * The parameter space. A design system is a point in here; a swipe is a
 * pairwise comparison along exactly one axis.
 *
 * Pure — no React, no browser globals. Everything in lib/engine stays that way
 * so it can be unit tested, run in a worker, or moved server-side later.
 */

export const ENGINE_VERSION = 1;

export type ChromaLevel = 'muted' | 'balanced' | 'vivid';
export type NeutralTemp = 'cool' | 'pure' | 'warm';
export type Density = 'tight' | 'comfortable' | 'airy';
export type TypePairing =
  | 'geometric'
  | 'grotesk'
  | 'humanist'
  | 'serif-display'
  | 'mono-accent';
export type Depth = 'flat' | 'bordered' | 'soft-shadow' | 'hard-shadow';
export type WeightContrast = 'low' | 'high';
export type AccentUsage = 'subtle' | 'bold';

export type DesignParams = {
  hue: number;
  chroma: ChromaLevel;
  neutralTemp: NeutralTemp;
  radius: number;
  density: Density;
  typePairing: TypePairing;
  typeScale: number;
  depth: Depth;
  weightContrast: WeightContrast;
  accentUsage: AccentUsage;
};

export type AxisKey = keyof DesignParams;

type AxisDefFor<K extends AxisKey> = {
  key: K;
  label: string;
  /** Swipe rounds, so the flow reads as progressive refinement. */
  stage: number;
  /** Ordinal axes give partial credit to neighbouring values. */
  ordinal: boolean;
  /** Hue wraps: index 11 neighbours index 0. */
  circular?: boolean;
  values: readonly DesignParams[K][];
  describe: (v: DesignParams[K]) => string;
};

export type AxisDef = { [K in AxisKey]: AxisDefFor<K> }[AxisKey];

/** 12 hues at 30-degree steps. Enough resolution, few enough to converge fast. */
const HUES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330] as const;

const HUE_NAMES = [
  'red', 'orange', 'amber', 'lime', 'green', 'emerald',
  'cyan', 'sky', 'blue', 'violet', 'purple', 'pink',
] as const;

export const AXES: readonly AxisDef[] = [
  {
    key: 'hue',
    label: 'Brand hue',
    stage: 0,
    ordinal: true,
    circular: true,
    values: HUES,
    describe: (v) => HUE_NAMES[HUES.indexOf(v as (typeof HUES)[number])] ?? `${v}deg`,
  },
  {
    key: 'chroma',
    label: 'Colour intensity',
    stage: 0,
    ordinal: true,
    values: ['muted', 'balanced', 'vivid'],
    describe: (v) => v,
  },
  {
    key: 'neutralTemp',
    label: 'Neutral temperature',
    stage: 0,
    ordinal: true,
    values: ['cool', 'pure', 'warm'],
    describe: (v) => `${v} greys`,
  },
  {
    key: 'typePairing',
    label: 'Typeface',
    stage: 1,
    ordinal: false,
    values: ['geometric', 'grotesk', 'humanist', 'serif-display', 'mono-accent'],
    describe: (v) => v.replace('-', ' '),
  },
  {
    key: 'typeScale',
    label: 'Type scale',
    stage: 1,
    ordinal: true,
    values: [1.125, 1.2, 1.25, 1.333],
    describe: (v) => `${v} ratio`,
  },
  {
    key: 'weightContrast',
    label: 'Weight contrast',
    stage: 1,
    ordinal: true,
    values: ['low', 'high'],
    describe: (v) => `${v} contrast`,
  },
  {
    key: 'radius',
    label: 'Corner radius',
    stage: 2,
    ordinal: true,
    values: [0, 4, 8, 16, 9999],
    describe: (v) => (v === 9999 ? 'pill' : `${v}px`),
  },
  {
    key: 'density',
    label: 'Spacing',
    stage: 2,
    ordinal: true,
    values: ['tight', 'comfortable', 'airy'],
    describe: (v) => v,
  },
  {
    key: 'depth',
    label: 'Elevation',
    stage: 3,
    ordinal: false,
    values: ['flat', 'bordered', 'soft-shadow', 'hard-shadow'],
    describe: (v) => v.replace('-', ' '),
  },
  {
    key: 'accentUsage',
    label: 'Accent boldness',
    stage: 3,
    ordinal: true,
    values: ['subtle', 'bold'],
    describe: (v) => `${v} accents`,
  },
];

export const STAGE_COUNT = Math.max(...AXES.map((a) => a.stage)) + 1;

export const STAGE_LABELS = ['Colour', 'Type', 'Shape', 'Depth'];

export function axis(key: AxisKey): AxisDef {
  const found = AXES.find((a) => a.key === key);
  if (!found) throw new Error(`Unknown axis: ${key}`);
  return found;
}

/** Midpoint of every axis — the neutral prior before any swipes. */
export function defaultParams(): DesignParams {
  const out = {} as Record<AxisKey, unknown>;
  for (const a of AXES) out[a.key] = a.values[Math.floor(a.values.length / 2)];
  return out as DesignParams;
}
