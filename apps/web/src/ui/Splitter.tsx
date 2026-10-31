import { useCallback, useEffect, useState, type KeyboardEvent, type PointerEvent } from 'react';

const MIN_SIZE = 0.12;
const KEY_STEP = 0.02;

export function resizeAt(sizes: number[], index: number, delta: number, min = MIN_SIZE): number[] {
  const total = sizes.reduce((sum, s) => sum + s, 0);
  const a = sizes[index];
  const b = sizes[index + 1];
  if (a === undefined || b === undefined || total <= 0) return sizes;
  const floor = min * total;
  const shift = Math.max(floor - a, Math.min(b - floor, delta * total));
  const next = sizes.slice();
  next[index] = a + shift;
  next[index + 1] = b - shift;
  return next;
}

export function tracks(sizes: number[], gutter: number): string {
  return sizes.map((s) => `${s}fr`).join(` ${gutter}px `);
}

function valid(value: unknown, length: number): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((n) => typeof n === 'number' && Number.isFinite(n) && n > 0)
  );
}

export function useSizes(key: string, defaults: number[]): [number[], (fn: (cur: number[]) => number[]) => void, () => void] {
  const storageKey = `velocity.layout.${key}`;
  const [sizes, setSizes] = useState<number[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      if (valid(saved, defaults.length)) return saved;
    } catch {
      // unreadable or blocked storage, use the defaults
    }
    return defaults;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(sizes));
    } catch {
      // storage can be blocked, the layout still works for this visit
    }
  }, [storageKey, sizes]);

  const update = useCallback((fn: (cur: number[]) => number[]) => setSizes(fn), []);
  const reset = useCallback(() => setSizes(defaults), [defaults]);
  return [sizes, update, reset];
}

interface Props {
  axis: 'x' | 'y';
  label: string;
  fixed: number;
  onMove: (delta: number) => void;
  onReset: () => void;
}

export function Splitter({ axis, label, fixed, onMove, onReset }: Props) {
  const horizontal = axis === 'x';

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const parent = el.closest('[data-split]');
    if (!parent) return;
    el.setPointerCapture(e.pointerId);
    const box = parent.getBoundingClientRect();
    const style = getComputedStyle(parent);
    const padding = horizontal
      ? parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      : parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const available = Math.max(1, (horizontal ? box.width : box.height) - padding - fixed);
    let last = horizontal ? e.clientX : e.clientY;
    el.dataset.dragging = 'true';

    const move = (ev: globalThis.PointerEvent) => {
      const now = horizontal ? ev.clientX : ev.clientY;
      onMove((now - last) / available);
      last = now;
    };
    const stop = () => {
      delete el.dataset.dragging;
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', stop);
      el.removeEventListener('pointercancel', stop);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const back = horizontal ? 'ArrowLeft' : 'ArrowUp';
    const forward = horizontal ? 'ArrowRight' : 'ArrowDown';
    if (e.key === back) onMove(-KEY_STEP);
    else if (e.key === forward) onMove(KEY_STEP);
    else if (e.key === 'Home' || e.key === 'Enter') onReset();
    else return;
    e.preventDefault();
  };

  return (
    <div
      className={`splitter splitter-${axis}`}
      role="separator"
      aria-orientation={horizontal ? 'vertical' : 'horizontal'}
      aria-label={label}
      title="Drag to resize, double-click to reset"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={onReset}
    />
  );
}
