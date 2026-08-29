/**
 * DesignParams -> DesignTokens. The single transform every generator reads
 * from, so all export formats stay in sync by construction.
 */
import { brandRamp, neutralRamp, contrast, type Ramp, type RampStop } from './color';
import type { DesignParams, Density, Depth, TypePairing, WeightContrast } from './params';

export type SemanticColors = {
  bg: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentFg: string;
  accentSubtle: string;
};

export type DesignTokens = {
  color: {
    brand: Ramp;
    neutral: Ramp;
    light: SemanticColors;
    dark: SemanticColors;
  };
  radius: { sm: string; md: string; lg: string; full: string };
  spacing: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl', string>;
  type: {
    heading: string;
    body: string;
    mono: string;
    /** Google Fonts families to load, deduped. */
    families: string[];
    scale: Record<'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl', string>;
    weight: { heading: number; body: number; bold: number };
    leading: { tight: string; normal: string };
  };
  shadow: { sm: string; md: string; lg: string };
  borderWidth: string;
  /** Contrast ratios, surfaced so the UI can show they were verified. */
  audit: { textOnBg: number; accentOnSurface: number; accentFgOnAccent: number };
};

const FONTS: Record<TypePairing, { heading: string; body: string; mono: string }> = {
  geometric: { heading: 'Poppins', body: 'Inter', mono: 'JetBrains Mono' },
  grotesk: { heading: 'Space Grotesk', body: 'Inter', mono: 'JetBrains Mono' },
  humanist: { heading: 'Source Sans 3', body: 'Source Sans 3', mono: 'IBM Plex Mono' },
  'serif-display': { heading: 'Playfair Display', body: 'Lora', mono: 'IBM Plex Mono' },
  'mono-accent': { heading: 'JetBrains Mono', body: 'Inter', mono: 'JetBrains Mono' },
};

const DENSITY_UNIT: Record<Density, number> = { tight: 3.5, comfortable: 4, airy: 5 };
const SPACING_STEPS = { xs: 1, sm: 2, md: 4, lg: 6, xl: 10, '2xl': 16 } as const;

const HEADING_WEIGHT: Record<WeightContrast, number> = { low: 600, high: 800 };

/** The sentinel the radius axis uses for "fully rounded". */
const PILL = 9999;

function shadows(depth: Depth, neutral: Ramp): DesignTokens['shadow'] {
  switch (depth) {
    case 'flat':
      return { sm: 'none', md: 'none', lg: 'none' };
    case 'bordered':
      return { sm: 'none', md: 'none', lg: 'none' };
    case 'soft-shadow':
      return {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 12px -2px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        lg: '0 12px 32px -8px rgb(0 0 0 / 0.16), 0 4px 8px -4px rgb(0 0 0 / 0.08)',
      };
    case 'hard-shadow':
      return {
        sm: `2px 2px 0 0 ${neutral[900]}`,
        md: `4px 4px 0 0 ${neutral[900]}`,
        lg: `8px 8px 0 0 ${neutral[900]}`,
      };
  }
}

/** Pick whichever of light/dark foreground reads better on the accent. */
function foregroundFor(accent: string, neutral: Ramp): string {
  const light = neutral[50];
  const dark = neutral[950];
  return contrast(light, accent) >= contrast(dark, accent) ? light : dark;
}

/**
 * Some hues simply cannot clear AA at the preferred ramp stop — a vivid red at
 * 600 fails against both white and near-black. Walk along the ramp (darker for
 * light themes, lighter for dark ones) until the accent both carries readable
 * foreground text AND stays legible as text on its own surface.
 */
function accentPair(
  brand: Ramp,
  neutral: Ramp,
  surface: string,
  stops: readonly RampStop[],
): { accent: string; fg: string } {
  let fallback = { accent: brand[stops[0]!], fg: foregroundFor(brand[stops[0]!], neutral) };
  for (const stop of stops) {
    const accent = brand[stop];
    const fg = foregroundFor(accent, neutral);
    if (contrast(fg, accent) >= 4.5 && contrast(accent, surface) >= 4.5) return { accent, fg };
    fallback = { accent, fg };
  }
  return fallback;
}

// Bold accents start a step lighter so they read as a deliberate signal rather
// than as another dark surface; both orders end somewhere that passes AA.
const LIGHT_STOPS: Record<'bold' | 'subtle', readonly RampStop[]> = {
  bold: [600, 700, 800, 900],
  subtle: [700, 800, 900],
};
const DARK_STOPS: Record<'bold' | 'subtle', readonly RampStop[]> = {
  bold: [400, 300, 200],
  subtle: [300, 200, 100],
};

export function buildTokens(p: DesignParams): DesignTokens {
  const brand = brandRamp(p.hue, p.chroma);
  const neutral = neutralRamp(p.neutralTemp);

  const lightPair = accentPair(brand, neutral, '#ffffff', LIGHT_STOPS[p.accentUsage]);
  const darkPair = accentPair(brand, neutral, neutral[900], DARK_STOPS[p.accentUsage]);

  const light: SemanticColors = {
    bg: neutral[50],
    surface: '#ffffff',
    border: p.depth === 'bordered' ? neutral[300] : neutral[200],
    text: neutral[900],
    textMuted: neutral[600],
    accent: lightPair.accent,
    accentFg: lightPair.fg,
    accentSubtle: brand[100],
  };

  const dark: SemanticColors = {
    bg: neutral[950],
    surface: neutral[900],
    border: p.depth === 'bordered' ? neutral[700] : neutral[800],
    text: neutral[50],
    textMuted: neutral[400],
    accent: darkPair.accent,
    accentFg: darkPair.fg,
    accentSubtle: neutral[800],
  };

  const unit = DENSITY_UNIT[p.density];
  const spacing = {} as DesignTokens['spacing'];
  for (const [name, mult] of Object.entries(SPACING_STEPS)) {
    spacing[name as keyof typeof SPACING_STEPS] = `${+(unit * mult).toFixed(2)}px`;
  }

  const fonts = FONTS[p.typePairing];
  const scaleAt = (n: number) => `${+(16 * p.typeScale ** n).toFixed(2)}px`;

  return {
    color: { brand, neutral, light, dark },
    // Pill applies to buttons, inputs and badges — not to cards. A fully
    // rounded 400px-wide panel reads as a mistake, so the large step caps out.
    radius:
      p.radius === PILL
        ? { sm: '8px', md: `${PILL}px`, lg: '24px', full: `${PILL}px` }
        : {
            sm: `${Math.round(p.radius / 2)}px`,
            md: `${p.radius}px`,
            lg: `${Math.round(p.radius * 1.5)}px`,
            full: `${PILL}px`,
          },
    spacing,
    type: {
      heading: fonts.heading,
      body: fonts.body,
      mono: fonts.mono,
      families: [...new Set([fonts.heading, fonts.body, fonts.mono])],
      scale: {
        xs: scaleAt(-2), sm: scaleAt(-1), base: scaleAt(0), lg: scaleAt(1),
        xl: scaleAt(2), '2xl': scaleAt(3), '3xl': scaleAt(4), '4xl': scaleAt(5),
      },
      weight: { heading: HEADING_WEIGHT[p.weightContrast], body: 400, bold: 600 },
      leading: { tight: '1.2', normal: p.density === 'airy' ? '1.7' : '1.55' },
    },
    shadow: shadows(p.depth, neutral),
    borderWidth: p.depth === 'bordered' || p.depth === 'hard-shadow' ? '2px' : '1px',
    audit: {
      textOnBg: +contrast(light.text, light.bg).toFixed(2),
      accentOnSurface: +contrast(light.accent, light.surface).toFixed(2),
      accentFgOnAccent: +contrast(light.accentFg, light.accent).toFixed(2),
    },
  };
}
