import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Download, Link2, Check, RotateCcw, Sun, Moon } from 'lucide-react';
import { resolveParams, useSession } from '@/store/session';
import { ScaledPreview } from '@/components/ScaledPreview';
import { CodePanel } from '@/components/CodePanel';
import { AXES, axis, type AxisKey, type DesignParams } from '@/lib/engine/params';
import { buildTokens } from '@/lib/engine/tokens';
import { bundle } from '@/lib/engine/generators';
import { encodeParams } from '@/lib/engine/encode';
import { copyText, downloadZip } from '@/lib/download';

function AuditRow({ label, ratio }: { label: string; ratio: number }) {
  const pass = ratio >= 4.5;
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-zinc-400">{label}</span>
      <span className={pass ? 'text-emerald-400' : 'text-amber-400'}>
        {ratio}:1 {pass ? 'AA' : 'below AA'}
      </span>
    </div>
  );
}

export function ResultView({
  params,
  onOverride,
}: {
  params: DesignParams;
  onOverride?: <K extends AxisKey>(key: K, value: DesignParams[K]) => void;
}) {
  // The system's own mode is the default; this only records a manual override,
  // so switching Base in fine-tune still flips the preview.
  const [themeOverride, setThemeOverride] = useState<'light' | 'dark' | null>(null);
  const theme = themeOverride ?? params.mode;
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  const tokens = useMemo(() => buildTokens(params), [params]);
  const shareUrl = useMemo(
    () => `${window.location.origin}/s/${encodeParams(params)}`,
    [params],
  );
  const files = useMemo(() => bundle(params, { shareUrl }), [params, shareUrl]);

  async function share() {
    if (await copyText(shareUrl)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0 space-y-6">
        <div className="overflow-hidden rounded-2xl border border-zinc-800">
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2">
            <span className="text-xs text-zinc-400">Preview</span>
            <button
              onClick={() => setThemeOverride(theme === 'light' ? 'dark' : 'light')}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            >
              {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
              {theme === 'light' ? 'Dark' : 'Light'}
            </button>
          </div>
          <ScaledPreview params={params} theme={theme} focus="full" compact={false} ratio={16 / 10} />
        </div>

        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <button
                key={f.path}
                onClick={() => setActive(i)}
                className={`rounded-lg px-3 py-1.5 font-mono text-xs transition-colors ${
                  i === active
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                }`}
              >
                {f.path}
              </button>
            ))}
          </div>
          <CodePanel file={files[active]!} />
        </div>
      </div>

      <aside className="space-y-6">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => downloadZip(files)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-3 font-semibold text-zinc-950 transition-colors hover:bg-white"
          >
            <Download size={17} /> Download .zip
          </button>
          <button
            onClick={share}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-3 text-zinc-200 transition-colors hover:border-zinc-500"
          >
            {copied ? <Check size={16} /> : <Link2 size={16} />}
            {copied ? 'Link copied' : 'Copy share link'}
          </button>
        </div>

        <section className="rounded-xl border border-zinc-800 p-4">
          <h3 className="mb-2 text-sm font-semibold text-zinc-200">Contrast</h3>
          <AuditRow label="Text on background" ratio={tokens.audit.textOnBg} />
          <AuditRow label="Accent on surface" ratio={tokens.audit.accentOnSurface} />
          <AuditRow label="Label on accent" ratio={tokens.audit.accentFgOnAccent} />
        </section>

        {onOverride && (
          <section className="rounded-xl border border-zinc-800 p-4">
            <h3 className="mb-3 text-sm font-semibold text-zinc-200">Fine-tune</h3>
            <div className="space-y-3">
              {AXES.map((a) => (
                <label key={a.key} className="block">
                  <span className="mb-1 block text-xs text-zinc-500">{a.label}</span>
                  <select
                    value={String(params[a.key])}
                    onChange={(e) => {
                      const match = a.values.find((v) => String(v) === e.target.value);
                      if (match !== undefined) onOverride(a.key, match as never);
                    }}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 focus-visible:outline-2 focus-visible:outline-zinc-500"
                  >
                    {a.values.map((v) => (
                      <option key={String(v)} value={String(v)}>
                        {axis(a.key).describe(v as never)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}

export default function Result() {
  const [, navigate] = useLocation();
  // Select raw state and derive; selecting a computed object would hand zustand
  // a new reference every render.
  const beliefs = useSession((s) => s.beliefs);
  const overrides = useSession((s) => s.overrides);
  const params = useMemo(() => resolveParams(beliefs, overrides), [beliefs, overrides]);
  const override = useSession((s) => s.override);
  const start = useSession((s) => s.start);
  const clearOverrides = useSession((s) => s.clearOverrides);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Your design system</h1>
          <p className="mt-1 text-zinc-400">Tailwind v4 tokens, components, and a README.</p>
        </div>
        <button
          onClick={() => {
            clearOverrides();
            start();
            navigate('/swipe');
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
        >
          <RotateCcw size={15} /> Start over
        </button>
      </header>

      <ResultView params={params} onOverride={override} />
    </main>
  );
}
