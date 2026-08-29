import { describe, it, expect } from 'vitest';
import { defaultParams, type DesignParams } from './params';
import { PRESETS } from './presets';
import { buildTokens } from './tokens';
import { bundle, generateAgentPrompt } from './generators';

const promptFor = (p: DesignParams) => generateAgentPrompt(buildTokens(p), p);

describe('agent setup prompt', () => {
  it('ships in the bundle', () => {
    expect(bundle(defaultParams()).map((f) => f.path)).toContain('SETUP-PROMPT.md');
  });

  it('carries every semantic token for both modes', () => {
    const out = promptFor(defaultParams());
    for (const key of ['bg', 'surface', 'border', 'text', 'text-muted', 'accent',
      'accent-fg', 'accent-subtle', 'accent-hover', 'surface-hover']) {
      expect(out, key).toContain(`--ds-${key}:`);
    }
    expect(out).toContain('prefers-color-scheme');
  });

  it('states the real contrast figures, not placeholders', () => {
    for (const preset of PRESETS) {
      const t = buildTokens(preset.params);
      expect(promptFor(preset.params), preset.id).toContain(`body ${t.audit.textOnBg}:1`);
    }
  });

  it('tells the agent to inspect before writing', () => {
    const out = promptFor(defaultParams());
    expect(out).toContain('Inspect the project first');
    expect(out).toMatch(/dark-mode convention/);
    expect(out).toMatch(/already exist\?/);
    expect(out).toContain('CLAUDE.md');
    expect(out).toContain('AGENTS.md');
    expect(out).toMatch(/\*\*7\. Report\*\*/);
  });

  it('names the fonts it expects to be loaded', () => {
    const out = promptFor({ ...defaultParams(), typePairing: 'serif-display' });
    expect(out).toContain('Playfair Display');
    expect(out).toContain('Lora');
  });

  it('matches font fallbacks to the family, not a blanket sans stack', () => {
    const serif = promptFor({ ...defaultParams(), typePairing: 'serif-display' });
    expect(serif).toContain('"Playfair Display", ui-serif');
    expect(serif).toContain('"Lora", ui-serif');

    const mono = promptFor({ ...defaultParams(), typePairing: 'terminal' });
    expect(mono).toContain('"JetBrains Mono", ui-monospace');
    expect(mono).not.toMatch(/"JetBrains Mono", ui-sans-serif/);

    const sans = promptFor({ ...defaultParams(), typePairing: 'geometric' });
    expect(sans).toContain('"Poppins", ui-sans-serif');
  });

  it('warns about headroom only when the accent is actually tight', () => {
    const tight = PRESETS.map((p) => ({ preset: p, t: buildTokens(p.params) }))
      .find(({ t }) => t.audit.accentOnSurface < 5.5);
    const roomy = PRESETS.map((p) => ({ preset: p, t: buildTokens(p.params) }))
      .find(({ t }) => t.audit.accentOnSurface >= 5.5);
    if (tight) expect(promptFor(tight.preset.params)).toContain('little headroom');
    if (roomy) expect(promptFor(roomy.preset.params)).not.toContain('little headroom');
  });

  it('mentions the gradient only for systems that have one', () => {
    expect(promptFor({ ...defaultParams(), surfaceStyle: 'gradient' })).toContain('--ds-bg-image');
    expect(promptFor({ ...defaultParams(), surfaceStyle: 'solid' })).not.toContain('--ds-bg-image');
  });

  it('mentions letter-spacing only for uppercase systems', () => {
    expect(promptFor({ ...defaultParams(), textTransform: 'uppercase' }))
      .toContain('uppercase without the tracking');
    expect(promptFor({ ...defaultParams(), textTransform: 'none' }))
      .not.toContain('uppercase without the tracking');
  });

  it('describes hover in terms of what this system actually does', () => {
    expect(promptFor({ ...defaultParams(), depth: 'hard-shadow', interaction: 'auto' }))
      .toContain('presses the element into its shadow');
    expect(promptFor({ ...defaultParams(), depth: 'glow', interaction: 'auto' }))
      .toContain('intensifies the glow');
  });

  it('stays pasteable', () => {
    for (const preset of PRESETS) {
      const lines = promptFor(preset.params).split('\n');
      expect(lines.length, preset.id).toBeLessThan(160);
    }
  });

  it('closes every fence it opens', () => {
    for (const preset of PRESETS) {
      const fences = (promptFor(preset.params).match(/```/g) ?? []).length;
      expect(fences % 2, preset.id).toBe(0);
    }
  });
});
