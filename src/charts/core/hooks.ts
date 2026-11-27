import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

export interface Size {
  width: number;
  height: number;
}

/**
 * Measures an element with ResizeObserver. Reads the box synchronously before paint
 * so charts never flash at a wrong width; falls back to `fallback` where layout is unavailable (jsdom, SSR).
 */
export function useElementSize<T extends HTMLElement>(fallback: Size = { width: 640, height: 320 }) {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<Size>(fallback);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = (w: number, h: number) => {
      if (w <= 0) return;
      setSize((prev) => (prev.width === Math.round(w) && prev.height === Math.round(h) ? prev : { width: Math.round(w), height: Math.round(h) }));
    };
    const rect = el.getBoundingClientRect();
    apply(rect.width, rect.height);
    if (typeof ResizeObserver === 'undefined') return;
    let frame = 0;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => apply(entry.contentRect.width, entry.contentRect.height));
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);

  return [ref, size] as const;
}

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
  const mql = window.matchMedia(REDUCED_QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(REDUCED_QUERY).matches : false),
    () => false,
  );
}

/** Stable unique-ish id prefix for aria wiring. */
let idCounter = 0;
export function useStableId(prefix: string): string {
  const [id] = useState(() => `${prefix}-${++idCounter}`);
  return id;
}

/**
 * Roving focus for a set of SVG marks: one mark is in the tab order, arrow keys move between them.
 * `resolveKey` maps a key to the next index (or null to ignore), so each chart owns its own geometry.
 */
export function useRovingFocus(count: number, resolveKey: (key: string, index: number, shift: boolean) => number | null) {
  const [active, setActive] = useState(0);
  const refs = useRef<(SVGElement | null)[]>([]);
  const clamped = Math.min(Math.max(active, 0), Math.max(count - 1, 0));

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const next = resolveKey(event.key, clamped, event.shiftKey);
      if (next === null || count === 0) return;
      event.preventDefault();
      const bounded = Math.min(Math.max(next, 0), count - 1);
      setActive(bounded);
      refs.current[bounded]?.focus();
    },
    [clamped, count, resolveKey],
  );

  const register = useCallback(
    (index: number) => (el: SVGElement | null) => {
      refs.current[index] = el;
    },
    [],
  );

  const focusAt = useCallback((index: number) => {
    setActive(index);
    refs.current[index]?.focus();
  }, []);

  return { active: clamped, setActive, onKeyDown, register, focusAt };
}

/** Animates a number from 0 to `target` once (honours reduced motion). */
export function useCountUp(target: number, durationMs = 700, enabled = true): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(enabled && !reduced ? 0 : target);
  useEffect(() => {
    if (!enabled || reduced || typeof requestAnimationFrame === 'undefined') {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, enabled, reduced]);
  return value;
}
