/**
 * Share links carry the params, never the generated files — ~30 bytes encoded
 * instead of ~200 kB, and a saved system improves whenever the generator does.
 *
 * ENGINE_VERSION rides along from the very first link. The day the generator
 * changes meaningfully, you need to know which systems predate it.
 */
import { AXES, ENGINE_VERSION, type AxisDef, type AxisKey, type DesignParams } from './params';

function toBase64Url(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
}

/**
 * Snap a value to an axis index. Exact match wins; failing that, numeric
 * ordinal axes take the nearest candidate (wrapping on hue), so a fine-tuned
 * off-grid value still round-trips to something close rather than silently
 * resetting to the midpoint.
 */
function indexFor(a: AxisDef, value: unknown): number {
  const exact = (a.values as readonly unknown[]).indexOf(value);
  if (exact !== -1) return exact;

  if (a.ordinal && typeof value === 'number') {
    const span = a.circular ? 360 : Infinity;
    let best = -1;
    let bestDistance = Infinity;
    (a.values as readonly unknown[]).forEach((candidate, i) => {
      if (typeof candidate !== 'number') return;
      const raw = Math.abs(candidate - value);
      const d = a.circular ? Math.min(raw, span - raw) : raw;
      if (d < bestDistance) {
        bestDistance = d;
        best = i;
      }
    });
    if (best !== -1) return best;
  }

  return Math.floor(a.values.length / 2);
}

/** [version, ...one value index per axis] — positional, so it stays tiny. */
export function encodeParams(p: DesignParams): string {
  const indices = AXES.map((a) => indexFor(a, p[a.key]));
  return toBase64Url(JSON.stringify([ENGINE_VERSION, ...indices]));
}

export type DecodeResult =
  | { ok: true; params: DesignParams; version: number }
  | { ok: false; error: string };

export function decodeParams(seed: string): DecodeResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fromBase64Url(seed));
  } catch {
    return { ok: false, error: 'That link is not a valid design system seed.' };
  }

  if (!Array.isArray(parsed) || parsed.length !== AXES.length + 1) {
    return { ok: false, error: 'That link is malformed or from a different version.' };
  }

  const [version, ...indices] = parsed as number[];
  if (version !== ENGINE_VERSION) {
    return {
      ok: false,
      error: `This link was made with engine v${version}; this app runs v${ENGINE_VERSION}.`,
    };
  }

  const out = {} as Record<AxisKey, unknown>;
  for (const [n, a] of AXES.entries()) {
    const i = indices[n];
    if (typeof i !== 'number' || i < 0 || i >= a.values.length) {
      return { ok: false, error: `Out-of-range value for ${a.label}.` };
    }
    out[a.key] = a.values[i];
  }

  return { ok: true, params: out as DesignParams, version };
}
