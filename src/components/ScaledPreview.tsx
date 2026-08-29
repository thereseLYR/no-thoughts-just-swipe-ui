import { useEffect, useRef, useState } from 'react';
import { FocusView, type Focus } from './FocusView';
import type { DesignParams } from '@/lib/engine/params';

const DESIGN_WIDTH = 720;

/**
 * Renders the preview at a fixed size and scales it to fit.
 *
 * Without this the preview reflows to the card's width, so the same design
 * looks different on a phone than on a desktop — and worse, the two cards in a
 * comparison could clip differently. Fixed size plus transform keeps every
 * comparison a like-for-like screenshot.
 */
export function ScaledPreview({
  params,
  // Undefined, not 'light': the token set decides its own default mode, and a
  // dark-first system must preview dark unless something explicitly overrides.
  theme,
  focus = 'full',
  compact = true,
  ratio = 4 / 3,
}: {
  params: DesignParams;
  theme?: 'light' | 'dark';
  focus?: Focus;
  compact?: boolean;
  ratio?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? DESIGN_WIDTH;
      setScale(width / DESIGN_WIDTH);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative w-full overflow-hidden" style={{ aspectRatio: ratio }}>
      <div
        style={{
          width: DESIGN_WIDTH,
          height: DESIGN_WIDTH / ratio,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <FocusView params={params} theme={theme} focus={focus} compact={compact} />
      </div>
    </div>
  );
}
