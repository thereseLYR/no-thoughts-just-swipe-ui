import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { useEffect } from 'react';
import { ScaledPreview } from './ScaledPreview';
import type { Focus } from './FocusView';
import type { DesignParams } from '@/lib/engine/params';

const THRESHOLD = 90;

/**
 * Drag is an affordance, not the only one. Click and keyboard both work — a
 * swipe-only interface is an accessibility dead end, and on desktop most people
 * will click anyway.
 */
export function SwipeCard({
  params,
  side,
  label,
  blurb,
  focus,
  onPick,
  disabled,
}: {
  params: DesignParams;
  side: 'a' | 'b';
  label: string;
  blurb?: string;
  focus: Focus;
  onPick: () => void;
  disabled?: boolean;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-6, 6]);
  const glow = useTransform(x, [-120, 0, 120], [0.9, 0, 0.9]);

  useEffect(() => {
    x.set(0);
  }, [params, x]);

  return (
    <motion.button
      type="button"
      aria-label={`Choose ${label}`}
      disabled={disabled}
      onClick={onPick}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.5}
      style={{ x, rotate }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.995 }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > THRESHOLD) onPick();
        else animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
      }}
      className="group relative block w-full cursor-pointer overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 text-left shadow-2xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100 disabled:pointer-events-none disabled:opacity-60 hover:border-zinc-600"
    >
      <motion.div
        aria-hidden
        style={{ opacity: glow }}
        className="pointer-events-none absolute inset-0 z-10 bg-zinc-100/10"
      />
      <ScaledPreview params={params} focus={focus} />
      <div className="flex items-start justify-between gap-3 border-t border-zinc-800 px-4 py-3">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-zinc-200">{label}</span>
          {blurb && <span className="mt-0.5 block text-xs text-zinc-500">{blurb}</span>}
        </span>
        <kbd className="shrink-0 rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
          {side === 'a' ? '←' : '→'}
        </kbd>
      </div>
    </motion.button>
  );
}
