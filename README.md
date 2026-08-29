# no thoughts, just swipe

Pick between two interfaces ~30 times. Get a Tailwind v4 design system.

```bash
npm install
npm run dev
```

## How it works

A design system is a **point in a parameter space**, and a swipe is a comparison
between two points. No LLM in the loop — deterministic, client-side, bounded.

Fourteen swipeable axes (`src/lib/engine/params.ts`), grouped into four facets,
plus one that is tuned rather than asked about:

| Facet | Axes |
| --- | --- |
| Colour | hue, chroma, neutral temperature, accent boldness |
| Surface | light/dark, surface treatment, elevation |
| Type | pairing, scale ratio, weight contrast, heading case |
| Shape | corner radius, border weight, density |

Hover (`interaction`) is marked `swipeable: false`. It rides in share links and
appears in fine-tune, but never costs a comparison — see below.

### The comparison anneals

The obvious design — vary one axis per swipe — is statistically clean and
unbearably dull. Thirty screens that differ by four pixels of border radius is a
survey, not a game. So the comparison narrows in dimensionality instead:

| Phase | Swipes | What differs | Weight |
| --- | --- | --- | --- |
| **Vibe** | 5 | Two complete aesthetics — Cyberpunk vs Pastel, Brutalist vs Editorial | 0.4 |
| **Facet** | 8 | One group of related axes moves together | 0.7 |
| **Detail** | to ~26 | A single axis | 1.0 |

The vibe round is *confounded* on purpose: preferring Cyberpunk over Pastel says
something about all twelve axes that differ, but not which one drove it. That is
a real cost, and it is priced in — `recordComparison` discounts each axis by the
phase weight, so a preset swipe buys 0.4 of an observation rather than a full
one. What you get back is a strong prior across the whole space in five swipes,
and an opening that is actually worth swiping through.

### Hover is derived, not asked

Elevation already answers the question. A system whose cards throw a hard offset
shadow wants buttons that press *into* that shadow; one that glows wants the
glow to intensify. So `interaction` defaults to `auto` and resolves from `depth`:

| depth | hover |
| --- | --- |
| flat, bordered | tint |
| soft-shadow | lift |
| hard-shadow | press (moves into the shadow as it shrinks) |
| glow | glow intensifies |

Overridable in fine-tune. The hover accent is one ramp step further from the
surface — darker on light themes, lighter on dark — so hovering can only improve
contrast, never degrade it. There is a test asserting that across every preset
in both modes.

Previewing it takes two mechanisms, because the swipe card is itself a
`<button>` and nesting interactive elements is invalid markup:

- **Results screen** — the preview is in a plain `<div>`, so real pointer hover
  works. Marked `data-ds-hoverable`.
- **Swipe cards** — rest and hover rendered side by side, labelled. Also better
  for comparison: four cells visible without moving the mouse, and it works on
  touch.

Both read `--ds-*` variables through one rule in `index.css`. Base state lives
there too, not inline — an inline `background` outranks a `:hover` rule and the
swap silently never happens.

### The preview shows only what changed

Matching the phase: the vibe round renders a full page mock, because everything
differs and the gestalt *is* the question. Every round after it renders a view
scoped to the facet under test — a type specimen, a colour ramp with buttons, a
single card showing elevation, a set of corners and rules.

Asking someone to spot four pixels of border radius across a nav, a hero, two
cards and a form is a search task, not a taste judgement. `focusFor(pair)`
derives the view from the comparison itself, and **F** (or the footer button)
expands any comparison to the full page.

The twelve archetypes live in `src/lib/engine/presets.ts`. Pairs are sampled
from the most-different quarter — pure argmax would show everyone the same two
extremes, pure random would show near-identical pairs.

Within the detail phase, value spacing still goes coarse to fine: early
comparisons on a long axis are widely separated, later ones pit the leader
against its closest rival.

Measured over 300 random hidden preferences (`src/lib/engine/sim.test.ts`):

```
distance  mean 3.18   p50 3.25   worst 6.25   (random baseline 7.00)
swipes    mean 24.2   min 19     max 26
beats random  98.3%
```

Distance, not exact matches — the confounded opening trades some per-axis
precision for the experience, and the fine-tune panel covers the remainder.

## Colour

Everything is computed in **OKLCH** and emitted as sRGB hex. Two parts matter:

- **Gamut mapping.** Many OKLCH coordinates fall outside sRGB. Clamping channels
  independently shifts hue and lightness, so a "uniform" ramp stops being
  uniform at the vivid end. `clampChroma` walks chroma down instead. The `neon`
  chroma level sits past sRGB for most hues, so this does real work.
- **Hue names are not HSL names.** OKLCH hue 0 is a raspberry rose; red is near
  30, and pure blue is out around 264. The labels in `params.ts` are named from
  what the buckets actually render.
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
src/components/     SwipeCard, Preview, FocusView, ScaledPreview, CodePanel
src/store/          zustand session, persisted to localStorage
```

`lib/engine` is deliberately framework-free. That is what keeps it unit-testable,
and what would let previews render server-side (OG images for shared links)
without a rewrite.

## Export

The primary path is a **single prompt you paste into a coding agent**, not a
zip. Three things decide whether a design system survives contact with a real
project — where the files go, which dark-mode convention is already in use, and
whether the names collide with what is there. None of them can be answered by a
file generated in advance, because all three depend on the target project.

So `SETUP-PROMPT.md` does not say "copy these files". It carries the exact
tokens and the rules, then tells the agent to inspect first — stylesheet
location, existing `.dark` vs `[data-theme]` convention, name collisions,
whether the project has `CLAUDE.md` or `AGENTS.md` — and to report what it
found. That turns all three friction points from user problems into inspection
steps, and it ends with a pointer for the agent-instructions file so the system
keeps applying after setup.

The zip stays available for people who would rather wire it up themselves.

| File | What it is |
| --- | --- |
| `SETUP-PROMPT.md` | Paste into Claude Code, Cursor, or any coding agent |
| `app.css` | Tailwind v4 `@theme` block — the source of truth |
| `tokens.json` | Same tokens as W3C DTCG — for v3 or non-Tailwind |
| `components/` | Button, Card, Input, Badge — hover driven by tokens, not hardcoded shades |
| `README.md` | Install steps and the contrast audit |

Theme vars are namespaced (`--color-brand-*`), so pasting into an existing
project extends Tailwind rather than redefining its defaults. The agent prompt
namespaces further to `--ds-*`, since it has no Tailwind naming constraint to
satisfy and collision-safety matters more there.

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
- **The facet round is still calmer than the opening.** Scoped previews made it
  legible, but it holds everything outside one facet fixed, so it can't match
  the drama of two whole aesthetics side by side. Varying two facets at once
  would help.
- **No fonts are self-hosted.** Previews and exports both pull Google Fonts over
  the network. `@fontsource-variable/*` would fix the FOUT.
- **No status colours.** The palette is brand + neutral, so alerts, toasts and
  validation states have nothing to draw from. The biggest gap for real use.
- **Focus and disabled are still hardcoded** in the generated components, the
  same way hover was before it became a token.
