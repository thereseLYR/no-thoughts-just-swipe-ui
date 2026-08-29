/**
 * All colour is computed in OKLCH and emitted as sRGB hex.
 *
 * Two things here are load-bearing and easy to get wrong by hand:
 *   1. Gamut mapping. Plenty of OKLCH coordinates fall outside sRGB. Clamping
 *      channels independently shifts hue AND lightness, so a "uniform" ramp
 *      stops being uniform exactly at the vivid end. clampChroma walks chroma
 *      down instead, preserving L and H.
 *   2. Contrast. Every accent-on-surface pair is verified here, not at export.
 */
import { clampChroma, formatHex, formatCss, wcagContrast } from 'culori';
import type { ChromaLevel, NeutralTemp } from './params';

export const RAMP_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type RampStop = (typeof RAMP_STOPS)[number];
export type Ramp = Record<RampStop, string>;

/** Perceptual lightness ladder. Even steps in OKLCH actually look even. */
const LIGHTNESS = [0.97, 0.94, 0.89, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42, 0.34, 0.26];

const PEAK_CHROMA: Record<ChromaLevel, number> = {
  muted: 0.06,
  balanced: 0.13,
  vivid: 0.2,
};

/** Neutral hue per temperature. Pure greys carry no chroma at all. */
const NEUTRAL_HUE: Record<NeutralTemp, number> = { cool: 250, pure: 0, warm: 70 };
const NEUTRAL_CHROMA: Record<NeutralTemp, number> = { cool: 0.014, pure: 0, warm: 0.012 };

/**
 * Chroma tapers toward both ends of the ramp — near-white and near-black hold
 * far less chroma before looking muddy — but never drops to zero, or the tints
 * read as grey rather than as a tinted brand colour.
 */
function chromaAt(lightness: number, peak: number): number {
  const distanceFromMid = Math.abs(2 * lightness - 1);
  return peak * (0.35 + 0.65 * (1 - distanceFromMid ** 2));
}

function oklchHex(l: number, c: number, h: number): string {
  return formatHex(clampChroma({ mode: 'oklch', l, c, h }, 'oklch', 'rgb')) ?? '#000000';
}

export function oklchCss(l: number, c: number, h: number): string {
  return formatCss(clampChroma({ mode: 'oklch', l, c, h }, 'oklch', 'rgb')) ?? 'oklch(0 0 0)';
}

function buildRamp(hue: number, peak: number): Ramp {
  const out = {} as Ramp;
  RAMP_STOPS.forEach((stop, i) => {
    const l = LIGHTNESS[i]!;
    out[stop] = oklchHex(l, chromaAt(l, peak), hue);
  });
  return out;
}

export function brandRamp(hue: number, chroma: ChromaLevel): Ramp {
  return buildRamp(hue, PEAK_CHROMA[chroma]);
}

export function neutralRamp(temp: NeutralTemp): Ramp {
  const out = {} as Ramp;
  const hue = NEUTRAL_HUE[temp];
  const peak = NEUTRAL_CHROMA[temp];
  RAMP_STOPS.forEach((stop, i) => {
    const l = LIGHTNESS[i]!;
    // Neutrals hold their slight tint evenly; the mid-taper would wash it out.
    out[stop] = oklchHex(l, peak, hue);
  });
  return out;
}

export function contrast(a: string, b: string): number {
  return wcagContrast(a, b);
}

/**
 * Walk a colour's lightness until it clears `min` against `bg`, preserving hue
 * and chroma. Returns the nearest passing colour, or the endpoint if the hue
 * simply cannot reach the target.
 */
export function ensureContrast(
  hue: number,
  chroma: number,
  bg: string,
  min = 4.5,
  direction: 'darker' | 'lighter' = 'darker',
): string {
  const step = direction === 'darker' ? -0.02 : 0.02;
  let l = direction === 'darker' ? 0.6 : 0.7;
  let best = oklchHex(l, chromaAt(l, chroma), hue);
  for (let i = 0; i < 40; i++) {
    if (contrast(best, bg) >= min) return best;
    l += step;
    if (l <= 0.05 || l >= 0.99) break;
    best = oklchHex(l, chromaAt(l, chroma), hue);
  }
  return best;
}

/** True when every pair clears WCAG AA for normal text. */
export function passesAA(pairs: Array<[string, string]>): boolean {
  return pairs.every(([fg, bg]) => contrast(fg, bg) >= 4.5);
}
