import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Maximize2, Minimize2, Undo2 } from 'lucide-react';
import { useSession } from '@/store/session';
import { SwipeCard } from '@/components/SwipeCard';
import { focusFor } from '@/lib/engine/pairing';


export default function Swipe() {
  const [, navigate] = useLocation();
  // Sticky across swipes: someone who wants the whole page wants it every time.
  const [showFull, setShowFull] = useState(false);
  const { current, done, swipes, choose, undo, start, progress, history } = useSession();

  // A direct hit on /swipe with no session should not show an empty screen.
  useEffect(() => {
    if (!current && !done) start();
  }, [current, done, start]);

  useEffect(() => {
    if (done) navigate('/result');
  }, [done, navigate]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') choose('a');
      else if (e.key === 'ArrowRight') choose('b');
      else if (e.key === 'Backspace') {
        e.preventDefault();
        undo();
      } else if (e.key === 'f' || e.key === 'F') setShowFull((v) => !v);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, undo]);

  if (!current) return null;

  const pct = Math.round(progress() * 100);
  const phaseLabel =
    current.kind === 'preset' ? 'Vibe' : current.kind === 'facet' ? 'Direction' : 'Detail';
  const natural = focusFor(current);
  const focus = showFull ? 'full' : natural;
  // The vibe round is already a full page, so there is nothing to expand into.
  const canExpand = natural !== 'full';

  return (
    <main className="mx-auto flex min-h-full max-w-5xl flex-col px-6 py-8">
      <header className="mb-8">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-zinc-300">{phaseLabel}</span>
          <span className="text-zinc-500">
            {swipes} swipes · {pct}% confident
          </span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-zinc-100 transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </header>

      <h2 className="mb-6 text-center text-xl font-semibold text-zinc-100">{current.prompt}</h2>

      <div className="grid gap-5 sm:grid-cols-2">
        <SwipeCard
          params={current.a}
          side="a"
          label={current.aLabel}
          blurb={current.aBlurb}
          focus={focus}
          onPick={() => choose('a')}
        />
        <SwipeCard
          params={current.b}
          side="b"
          label={current.bLabel}
          blurb={current.bBlurb}
          focus={focus}
          onPick={() => choose('b')}
        />
      </div>

      <footer className="mt-8 flex items-center justify-between text-sm text-zinc-500">
        <button
          onClick={undo}
          disabled={history.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 transition-colors hover:text-zinc-200 disabled:pointer-events-none disabled:opacity-40"
        >
          <Undo2 size={15} /> Undo
        </button>
        {canExpand ? (
          <button
            onClick={() => setShowFull((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 transition-colors hover:text-zinc-200"
          >
            {showFull ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            {showFull ? 'Just the difference' : 'Show full page'}
            <kbd className="ml-1 rounded border border-zinc-700 px-1 font-mono text-[10px] text-zinc-500">
              F
            </kbd>
          </button>
        ) : (
          <span className="hidden sm:block">Swipe, click, or use ← →</span>
        )}
        <button
          onClick={() => navigate('/result')}
          className="rounded-lg px-3 py-2 transition-colors hover:text-zinc-200"
        >
          Skip to result →
        </button>
      </footer>
    </main>
  );
}
