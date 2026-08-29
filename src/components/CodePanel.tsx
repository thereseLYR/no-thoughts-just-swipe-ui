import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyText } from '@/lib/download';
import type { GeneratedFile } from '@/lib/engine/generators';

/**
 * Shiki, assembled from shiki/core with exactly four grammars.
 *
 * Importing from 'shiki' directly pulls in every language it ships — the build
 * grew chunks for wolfram, emacs-lisp and cpp before this was narrowed. The
 * JavaScript regex engine also avoids shipping the ~600 kB oniguruma wasm.
 *
 * Still dynamically imported: nobody needs a highlighter before the results
 * screen.
 */
let highlighterPromise: Promise<{
  codeToHtml: (code: string, opts: { lang: string; theme: string }) => string;
}> | null = null;

function getHighlighter() {
  highlighterPromise ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, css, json, tsx, md, theme] =
      await Promise.all([
        import('shiki/core'),
        import('shiki/engine/javascript'),
        import('shiki/langs/css.mjs'),
        import('shiki/langs/json.mjs'),
        import('shiki/langs/tsx.mjs'),
        import('shiki/langs/markdown.mjs'),
        import('shiki/themes/github-dark-default.mjs'),
      ]);
    return createHighlighterCore({
      langs: [css.default, json.default, tsx.default, md.default],
      themes: [theme.default],
      engine: createJavaScriptRegexEngine(),
    });
  })();
  return highlighterPromise;
}
export function CodePanel({ file }: { file: GeneratedFile }) {
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    setHtml(null);
    getHighlighter()
      .then((hl) =>
        hl.codeToHtml(file.contents, { lang: file.language, theme: 'github-dark-default' }),
      )
      .then((out) => live && setHtml(out))
      .catch(() => live && setHtml(null));
    return () => {
      live = false;
    };
  }, [file]);

  async function onCopy() {
    if (await copyText(file.contents)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <span className="font-mono text-xs text-zinc-400">{file.path}</span>
        <button
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="max-h-[26rem] overflow-auto p-4 text-[13px] leading-relaxed [&_pre]:!bg-transparent">
        {html ? (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <pre className="font-mono text-zinc-400">{file.contents}</pre>
        )}
      </div>
    </div>
  );
}
