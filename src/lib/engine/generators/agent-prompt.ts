/**
 * A single paste-into-your-agent block.
 *
 * This is the primary delivery path, not a convenience. Three things decide
 * whether a design system survives contact with a real project — where the
 * files go, which dark-mode convention is already in use, and whether the
 * names collide with what is there. None of them can be answered by a file
 * generated in advance, because all three depend on the target project.
 *
 * So the prompt does not say "copy these files". It tells the agent to look
 * first, and to report what it found. That turns all three from user problems
 * into inspection steps.
 *
 * Variables are namespaced `--ds-*` here, unlike the Tailwind export, which
 * must use Tailwind's own colour and spacing namespaces to generate utilities.
 * This path has no such constraint, so it takes the collision-safe option.
 */
import { RAMP_STOPS } from '../color';
import type { DesignTokens, SemanticColors } from '../tokens';
import type { DesignParams } from '../params';
import type { ResolvedInteraction } from '../tokens';

const INTERACTION_BLURB: Record<ResolvedInteraction, string> = {
  tint: 'hover shifts the background one step, nothing moves',
  lift: 'hover raises the element and deepens its shadow',
  press: 'hover presses the element into its shadow as the shadow shrinks',
  glow: 'hover intensifies the glow',
};

function kebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/** Semantic colours as --ds-* declarations, skipping the gradient. */
function semantic(c: SemanticColors, indent: string): string {
  return (Object.entries(c) as Array<[string, string | null]>)
    .filter(([k, v]) => k !== 'bgImage' && typeof v === 'string')
    .map(([k, v]) => `${indent}--ds-${kebab(k)}: ${v};`)
    .concat(c.bgImage ? [`${indent}--ds-bg-image: ${c.bgImage};`] : [])
    .join('\n');
}

/** Pack a record onto shared lines — a 60-line wall of tokens gets skimmed. */
function packed(entries: Array<[string, string]>, prefix: string, perLine: number): string {
  const cells = entries.map(([k, v]) => `--ds-${prefix}${k}: ${v};`);
  const lines: string[] = [];
  for (let i = 0; i < cells.length; i += perLine) {
    lines.push(`  ${cells.slice(i, i + perLine).join('  ')}`);
  }
  return lines.join('\n');
}

export function generateAgentPrompt(t: DesignTokens, p: DesignParams): string {
  const primary = t.color[t.mode];
  const other = t.color[t.mode === 'dark' ? 'light' : 'dark'];
  const otherName = t.mode === 'dark' ? 'Light' : 'Dark';

  const ramp = packed(
    RAMP_STOPS.map((s) => [`brand-${s}`, t.color.brand[s]] as [string, string]),
    '',
    3,
  );
  const spacing = packed(Object.entries(t.spacing), 'space-', 3);
  const text = packed(Object.entries(t.type.scale), 'text-', 3);
  const radius = packed(Object.entries(t.radius), 'radius-', 2);

  // Only warn when it is actually tight. A blanket caution trains people to
  // ignore the line.
  const headroom =
    t.audit.accentOnSurface < 5.5
      ? '\n  Accent-on-surface has little headroom — do not darken the surface or\n  lighten the accent.'
      : '';

  const caseNote =
    t.type.transform === 'uppercase'
      ? '\n- Headings are uppercase with `--ds-tracking` letter-spacing. Apply both\n  together; uppercase without the tracking looks cramped.'
      : '';

  const gradientNote = primary.bgImage
    ? '\n- The page background is a gradient (`--ds-bg-image`). Set it on the body\n  alongside `--ds-bg`, which is the fallback and the colour behind it.'
    : '';

  return `Set up this design system in my project. It was generated with contrast
already verified — preserve that.

## Tokens — use these values exactly, do not adjust them

\`\`\`css
:root {
  /* Brand ramp */
${ramp}

  /* Semantic — this system leads with ${t.mode.toUpperCase()} */
${semantic(primary, '  ')}

  /* Spacing */
${spacing}

  /* Type — ${p.typeScale} scale */
${text}
  --ds-font-heading: ${t.type.stacks.heading};
  --ds-font-body: ${t.type.stacks.body};
  --ds-font-mono: ${t.type.stacks.mono};
  --ds-weight-heading: ${t.type.weight.heading};
  --ds-leading: ${t.type.leading.normal};
  --ds-leading-tight: ${t.type.leading.tight};
  --ds-tracking: ${t.type.tracking};
  --ds-transform: ${t.type.transform};

  /* Shape */
${radius}
  --ds-border-width: ${t.borderWidth};
  --ds-shadow-sm: ${t.shadow.sm};
  --ds-shadow-md: ${t.shadow.md};
  --ds-shadow-lg: ${t.shadow.lg};

  /* Interaction — ${t.interaction.style}: ${INTERACTION_BLURB[t.interaction.style]} */
  --ds-shadow-hover: ${t.interaction.shadow};
  --ds-hover-transform: ${t.interaction.transform};
  --ds-transition: ${t.interaction.transition};
}

/* ${otherName} variant — semantic layer only, the ramp is shared.
   Rewire this selector to whatever convention the project already uses. */
@media (prefers-color-scheme: ${t.mode === 'dark' ? 'light' : 'dark'}) {
  :root:not([data-theme="${t.mode}"]) {
${semantic(other, '    ')}
  }
}
\`\`\`

## Rules

- Never write a raw hex, rgb, or arbitrary pixel value. Everything comes from
  a \`--ds-*\` variable.
- One accent-coloured action per view. Everything else is secondary or ghost.
- Body copy is \`--ds-text\` on \`--ds-bg\`. \`--ds-text-muted\` is for secondary
  content only — never for body copy, never for form labels.
- All text clears 4.5:1. Verified: body ${t.audit.textOnBg}:1, accent on surface
  ${t.audit.accentOnSurface}:1, label on accent ${t.audit.accentFgOnAccent}:1.${headroom}
- Hover changes background, box-shadow and transform together via the variables
  above: ${INTERACTION_BLURB[t.interaction.style]}.
  Respect \`prefers-reduced-motion\`.${caseNote}${gradientNote}

## Steps

**1. Inspect the project first, then decide:**

- Where do stylesheets live? Put the files there, not at the root by default.
- Is there an existing dark-mode convention — a \`.dark\` class, a \`[data-theme]\`
  attribute, or only \`prefers-color-scheme\`? Wire the ${otherName.toLowerCase()} variant to
  whatever is already in use. Do not introduce a second mechanism.
- Do \`--ds-*\` names, or class names like \`.btn\` and \`.card\`, already exist? If
  so, pick an unused prefix and apply it consistently across every file.
- Which agent-instructions file exists: \`CLAUDE.md\`, \`AGENTS.md\`, both, or
  neither? Use what is there; create \`AGENTS.md\` only if neither exists.
- Which UI framework, if any? Match its conventions for the components.

**2. Create \`tokens.css\`** with the block above, the ${otherName.toLowerCase()} variant wired to
the convention you found.

**3. Create \`components.css\`** with \`.btn\` (primary / secondary / ghost),
\`.card\`, \`.input\` and \`.badge\`, built only from the variables. Include
\`:hover\`, \`:focus-visible\` and \`:disabled\` for every interactive element.

**4. Import them**, tokens before components. Load ${t.type.families.length} font${
    t.type.families.length === 1 ? '' : 's'
  } — ${t.type.families.join(', ')} — or
swap the family names for ones already loaded. Do not leave a font referenced
but unloaded.

**5. Write \`DESIGN.md\`** containing the Rules section above, the token table,
and a one-line note on where the files live.

**6. Add a pointer** to the agent-instructions file — a short conditional
reference, not the token dump:

> ## Design
> This project has a design system. Before writing or modifying any UI, read
> \`DESIGN.md\`. Never introduce raw hex values or ad-hoc spacing.

**7. Report** where you put each file, which dark-mode convention you matched,
and any prefix you applied.
`;
}
