/**
 * DesignParams -> DesignTokens. The single transform every generator reads
 * from, so all export formats stay in sync by construction.
 */
import { brandRamp, neutralRamp, contrast, type Ramp, type RampStop } from './color';
import type {
  BorderWeight, DesignParams, Density, Depth, Mode, SurfaceStyle,
  TextTransform, TypePairing, WeightContrast,
} from './params';

export type SemanticColors = {
  bg: string;
  /** Set when surfaceStyle is 'gradient' — a background-image value. */
  bgImage: string | null;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentFg: string;
  accentSubtle: string;
};

export type DesignTokens = {
  /** Which theme this system leads with. Both are always emitted. */
  mode: Mode;
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
    families: string[];
    scale: Record<'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl', string>;
    weight: { heading: number; body: number; bold: number };
    leading: { tight: string; normal: string };
    transform: TextTransform;
    tracking: string;
  };
  shadow: { sm: string; md: string; lg: string };
  borderWidth: string;
  audit: { textOnBg: number; accentOnSurface: number; accentFgOnAccent: number };
};

const FONTS: Record<TypePairing, { heading: string; body: string; mono: string }> = {
  geometric: { heading: 'Poppins', body: 'Inter', mono: 'JetBrains Mono' },
  grotesk: { heading: 'Space Grotesk', body: 'Inter', mono: 'JetBrains Mono' },
  humanist: { heading: 'Source Sans 3', body: 'Source Sans 3', mono: 'IBM Plex Mono' },
  'serif-display': { heading: 'Playfair Display', body: 'Lora', mono: 'IBM Plex Mono' },
  'mono-accent': { heading: 'JetBrains Mono', body: 'Inter', mono: 'JetBrains Mono' },
  terminal: { heading: 'JetBrains Mono', body: 'JetBrains Mono', mono: 'JetBrains Mono' },
  brutalist: { heading: 'Archivo', body: 'Archivo', mono: 'JetBrains Mono' },
};

const DENSITY_UNIT: Record<Density, number> = { tight: 3.5, comfortable: 4, airy: 5 };
const SPACING_STEPS = { xs: 1, sm: 2, md: 4, lg: 6, xl: 10, '2xl': 16 } as const;

const HEADING_WEIGHT: Record<WeightContrast, number> = { low: 600, high: 800, extreme: 900 };
const BORDER_PX: Record<BorderWeight, number> = { hairline: 1, medium: 2, heavy: 3 };

/** The sentinel the radius axis uses for "fully rounded". */
const PILL = 9999;

function shadows(depth: Depth, neutral: Ramp, accent: string): DesignTokens['shadow'] {
  switch (depth) {
    case 'flat':
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
    case 'glow':
      // Coloured light rather than cast shadow — reads as emission, which is
      // the whole point of neon.
      return {
        sm: `0 0 8px -1px ${accent}80`,
        md: `0 0 20px -2px ${accent}99, 0 0 4px -1px ${accent}66`,
        lg: `0 0 44px -6px ${accent}b3, 0 0 12px -2px ${accent}80`,
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

const LIGHT_STOPS: Record<'bold' | 'subtle', readonly RampStop[]> = {
  bold: [600, 700, 800, 900],
  subtle: [700, 800, 900],
};
const DARK_STOPS: Record<'bold' | 'subtle', readonly RampStop[]> = {
  bold: [400, 300, 200],
  subtle: [300, 200, 100],
};

function surfaceFor(style: SurfaceStyle, mode: Mode, brand: Ramp, neutral: Ramp): string {
  if (style !== 'tinted') return mode === 'light' ? '#ffffff' : neutral[900];
  return mode === 'light' ? brand[50] : brand[950];
}

function backgroundFor(
  style: SurfaceStyle,
  mode: Mode,
  brand: Ramp,
  neutral: Ramp,
): { bg: string; bgImage: string | null } {
  const base = mode === 'light' ? neutral[50] : neutral[950];
  if (style === 'gradient') {
    const wash = mode === 'light' ? brand[100] : brand[950];
    return {
      bg: base,
      bgImage: `radial-gradient(120% 90% at 15% 0%, ${wash} 0%, ${base} 60%)`,
    };
  }
  if (style === 'tinted') return { bg: mode === 'light' ? brand[50] : brand[950], bgImage: null };
  return { bg: base, bgImage: null };
}

export function buildTokens(p: DesignParams): DesignTokens {
  const brand = brandRamp(p.hue, p.chroma);
  const neutral = neutralRamp(p.neutralTemp);

  const lightSurface = surfaceFor(p.surfaceStyle, 'light', brand, neutral);
  const darkSurface = surfaceFor(p.surfaceStyle, 'dark', brand, neutral);

  const lightPair = accentPair(brand, neutral, lightSurface, LIGHT_STOPS[p.accentUsage]);
  const darkPair = accentPair(brand, neutral, darkSurface, DARK_STOPS[p.accentUsage]);

  const borderPx = BORDER_PX[p.borderWeight];
  // Heavier rules need more contrast to look deliberate rather than dirty.
  const lightBorder = borderPx >= 2 ? neutral[900] : neutral[200];
  const darkBorder = borderPx >= 2 ? neutral[600] : neutral[800];

  const lightBg = backgroundFor(p.surfaceStyle, 'light', brand, neutral);
  const darkBg = backgroundFor(p.surfaceStyle, 'dark', brand, neutral);

  const light: SemanticColors = {
    ...lightBg,
    surface: lightSurface,
    border: lightBorder,
    text: neutral[900],
    textMuted: neutral[600],
    accent: lightPair.accent,
    accentFg: lightPair.fg,
    accentSubtle: brand[100],
  };

  const dark: SemanticColors = {
    ...darkBg,
    surface: darkSurface,
    border: darkBorder,
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
  const primary = p.mode === 'dark' ? dark : light;

  return {
    mode: p.mode,
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
      leading: { tight: '1.15', normal: p.density === 'airy' ? '1.7' : '1.55' },
      transform: p.textTransform,
      // Uppercase without tracking looks cramped; lowercase with it looks loose.
      tracking: p.textTransform === 'uppercase' ? '0.06em' : '-0.01em',
    },
    shadow: shadows(p.depth, neutral, primary.accent),
    borderWidth: `${p.depth === 'bordered' ? Math.max(borderPx, 2) : borderPx}px`,
    audit: {
      textOnBg: +contrast(primary.text, primary.bg).toFixed(2),
      accentOnSurface: +contrast(primary.accent, primary.surface).toFixed(2),
      accentFgOnAccent: +contrast(primary.accentFg, primary.accent).toFixed(2),
    },
  };
}
