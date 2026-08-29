/**
 * Named aesthetics: whole points in the parameter space, not fragments.
 *
 * These drive the opening swipes. Comparing two complete looks is confounded —
 * a preference tells you about a combination, not a single axis — but early on
 * that is the right trade. You buy a strong prior across every axis at once,
 * and the comparison is actually fun to make. Single-axis questions come later,
 * when they are disambiguating rather than introducing.
 */
import type { DesignParams } from './params';

export type Preset = {
  id: string;
  name: string;
  blurb: string;
  params: DesignParams;
};

export const PRESETS: readonly Preset[] = [
  {
    id: 'corporate',
    name: 'Corporate',
    blurb: 'Safe, legible, unobjectionable.',
    params: {
      mode: 'light', hue: 240, chroma: 'balanced', neutralTemp: 'cool', accentUsage: 'bold',
      surfaceStyle: 'solid', depth: 'soft-shadow', typePairing: 'geometric', typeScale: 1.2,
      weightContrast: 'low', textTransform: 'none', radius: 8, borderWeight: 'hairline',
      density: 'comfortable',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    blurb: 'Neon on black, hard edges, all caps.',
    params: {
      mode: 'dark', hue: 330, chroma: 'neon', neutralTemp: 'cool', accentUsage: 'bold',
      surfaceStyle: 'gradient', depth: 'glow', typePairing: 'terminal', typeScale: 1.25,
      weightContrast: 'high', textTransform: 'uppercase', radius: 0, borderWeight: 'medium',
      density: 'tight',
    },
  },
  {
    id: 'brutalist',
    name: 'Brutalist',
    blurb: 'Heavy borders, hard shadows, no apologies.',
    params: {
      mode: 'light', hue: 90, chroma: 'vivid', neutralTemp: 'pure', accentUsage: 'bold',
      surfaceStyle: 'solid', depth: 'hard-shadow', typePairing: 'brutalist', typeScale: 1.5,
      weightContrast: 'extreme', textTransform: 'uppercase', radius: 0, borderWeight: 'heavy',
      density: 'tight',
    },
  },
  {
    id: 'soft',
    name: 'Soft',
    blurb: 'Rounded, warm, friendly. Lots of air.',
    params: {
      mode: 'light', hue: 330, chroma: 'balanced', neutralTemp: 'warm', accentUsage: 'subtle',
      surfaceStyle: 'tinted', depth: 'soft-shadow', typePairing: 'geometric', typeScale: 1.2,
      weightContrast: 'low', textTransform: 'none', radius: 9999, borderWeight: 'hairline',
      density: 'airy',
    },
  },
  {
    id: 'editorial',
    name: 'Editorial',
    blurb: 'Serif headlines, generous measure, quiet colour.',
    params: {
      mode: 'light', hue: 30, chroma: 'muted', neutralTemp: 'warm', accentUsage: 'subtle',
      surfaceStyle: 'solid', depth: 'flat', typePairing: 'serif-display', typeScale: 1.5,
      weightContrast: 'high', textTransform: 'none', radius: 0, borderWeight: 'hairline',
      density: 'airy',
    },
  },
  {
    id: 'terminal',
    name: 'Terminal',
    blurb: 'Phosphor green, monospace, zero decoration.',
    params: {
      mode: 'dark', hue: 150, chroma: 'neon', neutralTemp: 'pure', accentUsage: 'bold',
      surfaceStyle: 'solid', depth: 'bordered', typePairing: 'terminal', typeScale: 1.125,
      weightContrast: 'low', textTransform: 'uppercase', radius: 0, borderWeight: 'hairline',
      density: 'tight',
    },
  },
  {
    id: 'vapor',
    name: 'Vapour',
    blurb: 'Violet glow on deep space, big soft shapes.',
    params: {
      mode: 'dark', hue: 300, chroma: 'vivid', neutralTemp: 'cool', accentUsage: 'bold',
      surfaceStyle: 'gradient', depth: 'glow', typePairing: 'grotesk', typeScale: 1.333,
      weightContrast: 'high', textTransform: 'none', radius: 16, borderWeight: 'hairline',
      density: 'airy',
    },
  },
  {
    id: 'swiss',
    name: 'Swiss',
    blurb: 'Grid, red accent, nothing decorative.',
    params: {
      mode: 'light', hue: 30, chroma: 'vivid', neutralTemp: 'pure', accentUsage: 'bold',
      surfaceStyle: 'solid', depth: 'flat', typePairing: 'grotesk', typeScale: 1.333,
      weightContrast: 'extreme', textTransform: 'uppercase', radius: 0, borderWeight: 'medium',
      density: 'comfortable',
    },
  },
  {
    id: 'pastel',
    name: 'Pastel',
    blurb: 'Mint and cream, humanist type, gentle everything.',
    params: {
      mode: 'light', hue: 150, chroma: 'muted', neutralTemp: 'warm', accentUsage: 'subtle',
      surfaceStyle: 'tinted', depth: 'flat', typePairing: 'humanist', typeScale: 1.125,
      weightContrast: 'low', textTransform: 'none', radius: 16, borderWeight: 'hairline',
      density: 'airy',
    },
  },
  {
    id: 'noir',
    name: 'Noir',
    blurb: 'Monochrome, heavy rules, uppercase everything.',
    params: {
      mode: 'dark', hue: 30, chroma: 'muted', neutralTemp: 'pure', accentUsage: 'subtle',
      surfaceStyle: 'solid', depth: 'bordered', typePairing: 'brutalist', typeScale: 1.333,
      weightContrast: 'extreme', textTransform: 'uppercase', radius: 0, borderWeight: 'heavy',
      density: 'comfortable',
    },
  },
  {
    id: 'candy',
    name: 'Candy',
    blurb: 'Loud pink, pill shapes, hard shadow.',
    params: {
      mode: 'light', hue: 330, chroma: 'neon', neutralTemp: 'cool', accentUsage: 'bold',
      surfaceStyle: 'tinted', depth: 'hard-shadow', typePairing: 'geometric', typeScale: 1.25,
      weightContrast: 'high', textTransform: 'none', radius: 9999, borderWeight: 'medium',
      density: 'comfortable',
    },
  },
  {
    id: 'archive',
    name: 'Archive',
    blurb: 'Paper, amber, monospace labels.',
    params: {
      mode: 'light', hue: 60, chroma: 'muted', neutralTemp: 'warm', accentUsage: 'subtle',
      surfaceStyle: 'tinted', depth: 'bordered', typePairing: 'mono-accent', typeScale: 1.2,
      weightContrast: 'high', textTransform: 'uppercase', radius: 4, borderWeight: 'medium',
      density: 'comfortable',
    },
  },
];

export function presetById(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}
