import { useEffect, useRef, useState, type RefObject } from 'react';

// Lightweight pull-to-refresh hook. Returns a ref to attach to the scroll
// container plus the visual "pulledPx" so the caller can show a spinner.
//
// Works on touch devices (iOS / Android) — desktop is a no-op since we never
// see touchstart.

const TRIGGER_PX = 70;
const MAX_PX = 120;

export function usePullToRefresh<T extends HTMLElement>(
  onRefresh: () => Promise<void>,
): { ref: RefObject<T | null>; pulledPx: number; refreshing: boolean } {
  const ref = useRef<T | null>(null);
  const pulledRef = useRef(0);
  const [pulledPx, setPulledPx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startY = 0;
    let active = false;

    const update = (px: number) => {
      pulledRef.current = px;
      setPulledPx(px);
    };

    const onStart = (e: TouchEvent) => {
      if (el.scrollTop > 0) return;
      startY = e.touches[0]!.clientY;
      active = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!active) return;
      const dy = e.touches[0]!.clientY - startY;
      if (dy <= 0) {
        active = false;
        update(0);
        return;
      }
      update(Math.min(MAX_PX, dy * 0.5));
    };

    const onEnd = async () => {
      if (!active) return;
      active = false;
      const px = pulledRef.current;
      update(0);
      if (px >= TRIGGER_PX) {
        setRefreshing(true);
        try { await onRefresh(); } catch (err) { console.warn('refresh failed', err); }
        setRefreshing(false);
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);

    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [onRefresh]);

  return { ref, pulledPx, refreshing };
}
