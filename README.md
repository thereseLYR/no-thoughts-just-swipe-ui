# no thoughts, just swipe

Pick between two interfaces ~30 times. Get a Tailwind v4 design system.

```bash
npm install
npm run dev
```

## How it works

A design system is a **point in a parameter space**, and a swipe is a pairwise
comparison along exactly one axis. No LLM in the loop — the whole thing is
deterministic, runs client-side, and converges in a bounded number of questions.

Ten axes (`src/lib/engine/params.ts`), grouped into four stages so the flow
reads as progressive refinement:

| Stage | Axes |
| --- | --- |
| Colour | hue, chroma, neutral temperature |
| Type | pairing, scale ratio, weight contrast |
| Shape | corner radius, density |
| Depth | elevation, accent boldness |

Each swipe:

1. Picks the axis with the least information so far (entropy, plus a floor on
   observations so a single answer can't retire an axis).
2. Renders two cards differing on **only** that axis.
3. Updates scores, bleeding partial credit into neighbouring values on ordinal
   axes.

Pair selection goes coarse to fine: early comparisons on a long axis are widely
spaced to map the space, later ones pit the leader against its closest rival.
Always anchoring on the current leader traps the search at whatever value it
started from.

Measured over 300 random hidden preferences (`src/lib/engine/sim.test.ts`):

```
swipes    mean 30.3   p50 30   max 34
accuracy  mean 94.2%  ≥80% of axes in 99.7% of runs
exact     49% recover all 10 axes
```

## Colour

Everything is computed in **OKLCH** and emitted as sRGB hex. Two parts matter:

- **Gamut mapping.** Many OKLCH coordinates fall outside sRGB. Clamping channels
  independently shifts hue and lightness, so a "uniform" ramp stops being
  uniform at the vivid end. `clampChroma` walks chroma down instead.
- **Contrast.** Some hues can't clear AA at the preferred ramp stop — vivid red
  at 600 fails against both white and near-black. `accentPair` walks the ramp
  until the accent carries readable text *and* stays legible on its surface.

`buildTokens` never emits a palette that fails WCAG AA for body text; there's a
test asserting that across the entire parameter space.

## Layout

```
src/lib/engine/     pure — no React, no browser globals, no I/O
  params.ts         the parameter space + axis metadata
  scoring.ts        belief state, entropy, settling rules
  pairing.ts        which axis next, which two values
  color.ts          OKLCH ramps, gamut mapping, contrast (culori)
  tokens.ts         DesignParams -> DesignTokens
  encode.ts         params <-> base64url share seeds
  generators/       tailwind-v4 | dtcg | components | readme
src/routes/         landing, swipe, result, shared
src/components/     SwipeCard, Preview, ScaledPreview, CodePanel
src/store/          zustand session, persisted to localStorage
```

`lib/engine` is deliberately framework-free. That is what keeps it unit-testable,
and what would let previews render server-side (OG images for shared links)
without a rewrite.

## Export

| File | What it is |
| --- | --- |
| `app.css` | Tailwind v4 `@theme` block — the source of truth |
| `tokens.json` | Same tokens as W3C DTCG — the escape hatch for v3 or non-Tailwind |
| `components/` | Button, Card, Input, Badge |
| `README.md` | Install steps and the contrast audit |

Theme vars are namespaced (`--color-brand-*`), so pasting into an existing
project extends Tailwind rather than redefining its defaults.

## Sharing

Share links carry the params, not the files: `[version, ...one index per axis]`
→ base64url, under 40 characters. Deterministic generation means the link
reproduces the system exactly, with no database. `ENGINE_VERSION` rides along
from the first link so a future generator change can be detected.

Path routing needs an SPA fallback (see `vercel.json`). To drop that
requirement, wouter's location source swaps in one line — see `src/App.tsx`.

## Scripts

```bash
npm run dev         # vite
npm run build       # typecheck + build
npm test            # vitest, engine only
npm run test:e2e    # playwright
```

## Known gaps

- **Mobile is stacked, not swiped.** Two cards in a column below 640px. A
  Tinder-style app deserves one card at a time with a real drag gesture.
- **~30 swipes** is longer than the "20 questions" pitch. The knob is `minAsks`
  in `scoring.ts`; trimming hue from 12 buckets to 8 is the cheapest win.
- **No fonts are self-hosted.** Previews and exports both pull Google Fonts over
  the network. `@fontsource-variable/*` would fix the FOUT.
