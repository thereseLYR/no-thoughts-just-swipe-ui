import { useLocation } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { useSession } from '@/store/session';
import { AXES } from '@/lib/engine/params';

export default function Landing() {
  const [, navigate] = useLocation();
  const start = useSession((s) => s.start);
  const swipes = useSession((s) => s.swipes);
  const done = useSession((s) => s.done);

  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col justify-center px-6 py-16">
      <h1 className="text-5xl font-extrabold tracking-tight text-zinc-50 sm:text-6xl">
        no thoughts,
        <br />
        just swipe
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-zinc-400">
        Starts wild — cyberpunk against pastel, brutalist against editorial — then
        narrows. About 25 picks to pin down {AXES.length} decisions, and you walk away
        with a Tailwind v4 design system: tokens, components, contrast already checked.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <button
          onClick={() => {
            start();
            navigate('/swipe');
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-6 py-3 font-semibold text-zinc-950 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-100"
        >
          Start swiping <ArrowRight size={18} />
        </button>

        {swipes > 0 && (
          <button
            onClick={() => navigate(done ? '/result' : '/swipe')}
            className="rounded-xl border border-zinc-700 px-5 py-3 text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
          >
            Resume ({swipes} swipe{swipes === 1 ? '' : 's'} in)
          </button>
        )}
      </div>

      <p className="mt-8 text-sm text-zinc-500">
        Nothing is uploaded. Your session lives in this browser until you export it.
      </p>
    </main>
  );
}
