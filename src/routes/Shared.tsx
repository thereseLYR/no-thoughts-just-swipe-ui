import { useLocation, useRoute } from 'wouter';
import { Sparkles } from 'lucide-react';
import { decodeParams } from '@/lib/engine/encode';
import { ResultView } from './Result';
import { useSession } from '@/store/session';

export default function Shared() {
  const [, params] = useRoute('/s/:seed');
  const [, navigate] = useLocation();
  const override = useSession((s) => s.override);
  const result = decodeParams(params?.seed ?? '');

  if (!result.ok) {
    return (
      <main className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-2xl font-bold text-zinc-100">Can't open that link</h1>
        <p className="mt-3 text-zinc-400">{result.error}</p>
        <button
          onClick={() => navigate('/')}
          className="mt-8 rounded-xl bg-zinc-100 px-5 py-2.5 font-semibold text-zinc-950 hover:bg-white"
        >
          Build your own
        </button>
      </main>
    );
  }

  /** Adopting a shared system seeds the fine-tune overrides, leaving the
   *  viewer's own swipe history untouched underneath. */
  function remix() {
    if (!result.ok) return;
    for (const [key, value] of Object.entries(result.params)) {
      override(key as never, value as never);
    }
    navigate('/result');
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Shared design system</h1>
          <p className="mt-1 text-zinc-400">Someone built this by swiping. Take it or tweak it.</p>
        </div>
        <button
          onClick={remix}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-white"
        >
          <Sparkles size={15} /> Remix this
        </button>
      </header>

      <ResultView params={result.params} />
    </main>
  );
}
