import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Undo2 } from 'lucide-react';
import { useSession } from '@/store/session';
import { SwipeCard } from '@/components/SwipeCard';
import { axis, STAGE_LABELS, type DesignParams } from '@/lib/engine/params';

export default function Swipe() {
  const [, navigate] = useLocation();
  const { current, done, stage, swipes, choose, undo, start, progress, history } = useSession();

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
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, undo]);

  if (!current) return null;

  const def = axis(current.axis);
  const describe = (p: DesignParams) => def.describe(p[current.axis] as never);
  const pct = Math.round(progress() * 100);

  return (
    <main className="mx-auto flex min-h-full max-w-5xl flex-col px-6 py-8">
      <header className="mb-8">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-zinc-300">
            {STAGE_LABELS[stage] ?? 'Refining'}
            <span className="ml-2 text-zinc-500">· {def.label}</span>
          </span>
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

      <h2 className="mb-6 text-center text-xl font-semibold text-zinc-100">
        Which do you prefer?
      </h2>

      <div className="grid gap-5 sm:grid-cols-2">
        <SwipeCard
          params={current.a}
          side="a"
          label={describe(current.a)}
          onPick={() => choose('a')}
        />
        <SwipeCard
          params={current.b}
          side="b"
          label={describe(current.b)}
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
        <span className="hidden sm:block">Swipe, click, or use ← →</span>
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
