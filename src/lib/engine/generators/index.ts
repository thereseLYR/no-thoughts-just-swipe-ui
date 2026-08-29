import { buildTokens } from '../tokens';
import type { DesignParams } from '../params';
import { generateTailwindV4, type ColorFormat } from './tailwind-v4';
import { generateDtcg } from './dtcg';
import { generateComponents, type GeneratedFile } from './components';
import { generateReadme } from './readme';

export type { GeneratedFile, ColorFormat };

/**
 * The full export set. Returns file descriptors rather than writing or zipping
 * anything, so the engine stays free of I/O and browser APIs.
 */
export function bundle(
  params: DesignParams,
  opts: { format?: ColorFormat; shareUrl?: string } = {},
): GeneratedFile[] {
  const tokens = buildTokens(params);
  return [
    { path: 'app.css', contents: generateTailwindV4(tokens, opts.format), language: 'css' },
    { path: 'tokens.json', contents: generateDtcg(tokens), language: 'json' },
    ...generateComponents(tokens, params),
    {
      path: 'README.md',
      contents: generateReadme(tokens, params, opts.shareUrl),
      language: 'markdown',
    },
  ];
}
