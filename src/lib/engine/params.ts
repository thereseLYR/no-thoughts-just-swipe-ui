/**
 * The parameter space. A design system is a point in here.
 *
 * The space is deliberately wide enough to reach genuinely opposed aesthetics —
 * neon-on-black terminal, heavy brutalist, soft pastel, restrained editorial —
 * not just variations on corporate blue. If two points in here cannot look
 * shockingly different, no amount of clever pairing will make the swipe
 * interesting.
 *
 * Pure — no React, no browser globals. Everything in lib/engine stays that way
 * so it can be unit tested, run in a worker, or moved server-side later.
 */

/** Bumped from 1: the parameter space gained four axes and several values. */
export const ENGINE_VERSION = 2;

export type Mode = 'light' | 'dark';
export type ChromaLevel = 'muted' | 'balanced' | 'vivid' | 'neon';
export type NeutralTemp = 'cool' | 'pure' | 'warm';
export type Density = 'tight' | 'comfortable' | 'airy';
export type TypePairing =
  | 'geometric'
  | 'grotesk'
  | 'humanist'
  | 'serif-display'
  | 'mono-accent'
  | 'terminal'
  | 'brutalist';
export type Depth = 'flat' | 'bordered' | 'soft-shadow' | 'hard-shadow' | 'glow';
export type WeightContrast = 'low' | 'high' | 'extreme';
export type AccentUsage = 'subtle' | 'bold';
export type TextTransform = 'none' | 'uppercase';
export type SurfaceStyle = 'solid' | 'tinted' | 'gradient';

export type DesignParams = {
  mode: Mode;
  hue: number;
  chroma: ChromaLevel;
  neutralTemp: NeutralTemp;
  accentUsage: AccentUsage;
  surfaceStyle: SurfaceStyle;
  depth: Depth;
  typePairing: TypePairing;
  typeScale: number;
  weightContrast: WeightContrast;
  textTransform: TextTransform;
  radius: number;
  borderWeight: BorderWeight;
  density: Density;
};

export type BorderWeight = 'hairline' | 'medium' | 'heavy';

export type AxisKey = keyof DesignParams;

/** Related axes that move together during the mid-game. */
export type Facet = 'palette' | 'surface' | 'type' | 'shape';

export const FACETS: readonly Facet[] = ['palette', 'surface', 'type', 'shape'];

export const FACET_LABELS: Record<Facet, string> = {
  palette: 'Colour',
  surface: 'Surface',
  type: 'Type',
  shape: 'Shape',
};

type AxisDefFor<K extends AxisKey> = {
  key: K;
  label: string;
  facet: Facet;
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

/**
 * Named from the colours these hues ACTUALLY produce in OKLCH, which is not
 * where HSL intuition puts them: OKLCH 0 is a raspberry rose, red sits near 30,
 * and pure blue is out around 264.
 */
const HUE_NAMES = [
  'rose', 'red', 'orange', 'gold', 'olive', 'green',
  'teal', 'cyan', 'azure', 'indigo', 'violet', 'magenta',
] as const;

export const AXES: readonly AxisDef[] = [
  {
    key: 'mode',
    label: 'Base',
    facet: 'surface',
    ordinal: false,
    values: ['light', 'dark'],
    describe: (v) => (v === 'dark' ? 'dark' : 'light'),
  },
  {
    key: 'hue',
    label: 'Brand hue',
    facet: 'palette',
    ordinal: true,
    circular: true,
    values: HUES,
    describe: (v) => HUE_NAMES[HUES.indexOf(v as (typeof HUES)[number])] ?? `${v}deg`,
  },
  {
    key: 'chroma',
    label: 'Colour intensity',
    facet: 'palette',
    ordinal: true,
    values: ['muted', 'balanced', 'vivid', 'neon'],
    describe: (v) => v,
  },
  {
    key: 'neutralTemp',
    label: 'Neutral temperature',
    facet: 'palette',
    ordinal: true,
    values: ['cool', 'pure', 'warm'],
    describe: (v) => `${v} greys`,
  },
  {
    key: 'accentUsage',
    label: 'Accent boldness',
    facet: 'palette',
    ordinal: true,
    values: ['subtle', 'bold'],
    describe: (v) => `${v} accents`,
  },
  {
    key: 'surfaceStyle',
    label: 'Surface treatment',
    facet: 'surface',
    ordinal: true,
    values: ['solid', 'tinted', 'gradient'],
    describe: (v) => v,
  },
  {
    key: 'depth',
    label: 'Elevation',
    facet: 'surface',
    ordinal: false,
    values: ['flat', 'bordered', 'soft-shadow', 'hard-shadow', 'glow'],
    describe: (v) => v.replace('-', ' '),
  },
  {
    key: 'typePairing',
    label: 'Typeface',
    facet: 'type',
    ordinal: false,
    values: [
      'geometric', 'grotesk', 'humanist', 'serif-display',
      'mono-accent', 'terminal', 'brutalist',
    ],
    describe: (v) => v.replace('-', ' '),
  },
  {
    key: 'typeScale',
    label: 'Type scale',
    facet: 'type',
    ordinal: true,
    values: [1.125, 1.2, 1.25, 1.333, 1.5],
    describe: (v) => `${v} ratio`,
  },
  {
    key: 'weightContrast',
    label: 'Weight contrast',
    facet: 'type',
    ordinal: true,
    values: ['low', 'high', 'extreme'],
    describe: (v) => `${v} contrast`,
  },
  {
    key: 'textTransform',
    label: 'Heading case',
    facet: 'type',
    ordinal: false,
    values: ['none', 'uppercase'],
    describe: (v) => (v === 'uppercase' ? 'UPPERCASE' : 'sentence case'),
  },
  {
    key: 'radius',
    label: 'Corner radius',
    facet: 'shape',
    ordinal: true,
    values: [0, 4, 8, 16, 9999],
    describe: (v) => (v === 9999 ? 'pill' : `${v}px`),
  },
  {
    key: 'borderWeight',
    label: 'Border weight',
    facet: 'shape',
    ordinal: true,
    values: ['hairline', 'medium', 'heavy'],
    describe: (v) => v,
  },
  {
    key: 'density',
    label: 'Spacing',
    facet: 'shape',
    ordinal: true,
    values: ['tight', 'comfortable', 'airy'],
    describe: (v) => v,
  },
];

export function axis(key: AxisKey): AxisDef {
  const found = AXES.find((a) => a.key === key);
  if (!found) throw new Error(`Unknown axis: ${key}`);
  return found;
}

export function axesInFacet(facet: Facet): readonly AxisDef[] {
  return AXES.filter((a) => a.facet === facet);
}

/** Midpoint of every axis — the neutral prior before any swipes. */
export function defaultParams(): DesignParams {
  const out = {} as Record<AxisKey, unknown>;
  for (const a of AXES) out[a.key] = a.values[Math.floor(a.values.length / 2)];
  return out as DesignParams;
}

/** Count of axes on which two points differ. Used to keep comparisons wild. */
export function paramDistance(a: DesignParams, b: DesignParams): number {
  return AXES.filter((x) => a[x.key] !== b[x.key]).length;
}
