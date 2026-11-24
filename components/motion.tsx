'use client';

import { createElement, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Rolls a number from its previous value to the new one (counting up or down); null renders an en dash. */
export function AnimatedNumber({ value, format, duration = 700 }: { value: number | null; format: (v: number) => string; duration?: number }) {
  const [display, setDisplay] = useState<number | null>(value);
  const current = useRef<number | null>(value);

  useEffect(() => {
    const from = current.current;
    if (value === null || from === null || from === value || prefersReducedMotion()) {
      current.current = value;
      setDisplay(value);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = from + (value - from) * (1 - Math.pow(1 - t, 3));
      current.current = v;
      setDisplay(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{display === null ? '–' : format(display)}</>;
}

/** Horizontal bar whose width grows from zero on mount and glides to each new percentage. */
export function AnimatedBar({ percent, className = '', style }: { percent: number; className?: string; style?: CSSProperties }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(percent));
    return () => cancelAnimationFrame(id);
  }, [percent]);
  return <div className={`transition-[width] duration-700 ease-out motion-reduce:transition-none ${className}`} style={{ ...style, width: `${width}%` }} />;
}

/**
 * FLIP animation: items keep their identity by key, so when the layout changes they slide from their old
 * position to the new one (vertically or horizontally), and new items fade in. Returns a ref factory per item.
 */
export function useFlipList(order: string[]) {
  const nodes = useRef(new Map<string, HTMLElement>());
  const previous = useRef(new Map<string, { x: number; y: number }>());
  const signature = order.join('|');

  useLayoutEffect(() => {
    const next = new Map<string, { x: number; y: number }>();
    nodes.current.forEach((el, key) => next.set(key, { x: el.offsetLeft, y: el.offsetTop }));
    if (!prefersReducedMotion()) {
      let entering = 0;
      nodes.current.forEach((el, key) => {
        const before = previous.current.get(key);
        const after = next.get(key)!;
        if (!before) {
          if (previous.current.size === 0) return;
          el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], {
            duration: 450,
            delay: entering++ * 60,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'backwards',
          });
        } else if (before.x !== after.x || before.y !== after.y) {
          el.animate([{ transform: `translate(${before.x - after.x}px, ${before.y - after.y}px)` }, { transform: 'translate(0, 0)' }], {
            duration: 650,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          });
        }
      });
    }
    previous.current = next;
  }, [signature]);

  return (key: string) => (el: HTMLElement | null) => {
    if (el) nodes.current.set(key, el);
    else nodes.current.delete(key);
  };
}

/** Fades (and nudges) an element in whenever `signature` changes after the first render. */
function useFadeOnChange<T extends HTMLElement>(signature: string, delay = 0, slide = true) {
  const ref = useRef<T>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (prefersReducedMotion()) return;
    ref.current?.animate(
      [
        { opacity: 0, transform: slide ? 'translateY(6px)' : 'none' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 500, delay, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' },
    );
  }, [signature, delay, slide]);
  return ref;
}

/** Text that fades in when it changes. `as` controls the element (use a block element for the slide to apply). */
export function FadeText({ text, as = 'span', className, delay = 0 }: { text: string; as?: 'span' | 'p' | 'h3' | 'div'; className?: string; delay?: number }) {
  const ref = useFadeOnChange<HTMLElement>(text, delay, as !== 'span');
  return createElement(as, { ref, className }, text);
}

const NUMBER = /\d[\d,]*(?:\.\d+)?/g;
const splitNumbers = (text: string) => ({ nums: text.match(NUMBER) ?? [], strs: text.split(NUMBER) });
const canRoll = (from: string, to: string) => {
  const a = splitNumbers(from);
  const b = splitNumbers(to);
  return a.nums.length > 0 && a.nums.length === b.nums.length && a.strs.join('\0') === b.strs.join('\0');
};
const formatLike = (value: number, token: string) => {
  const decimals = (token.split('.')[1] ?? '').length;
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: token.includes(',') });
};

/**
 * Text containing numbers ("45%", "+3pp", "500k travellers"). When the old and new text share the same wording the
 * numbers roll to their new values; otherwise the text fades to the new wording.
 */
export function AnimatedText({ text, className, duration = 700 }: { text: string; className?: string; duration?: number }) {
  const [display, setDisplay] = useState(text);
  const current = useRef(text);
  const fadeRef = useFadeOnChange<HTMLSpanElement>(canRoll(current.current, text) ? 'roll' : text, 0, false);

  useEffect(() => {
    const from = splitNumbers(current.current);
    const to = splitNumbers(text);
    if (!canRoll(current.current, text) || current.current === text || prefersReducedMotion()) {
      current.current = text;
      setDisplay(text);
      return;
    }
    const a = from.nums.map((n) => Number(n.replace(/,/g, '')));
    const b = to.nums.map((n) => Number(n.replace(/,/g, '')));
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      const out = to.strs.reduce((acc, str, i) => acc + str + (i < b.length ? (t === 1 ? to.nums[i] : formatLike(a[i] + (b[i] - a[i]) * e, to.nums[i])) : ''), '');
      current.current = out;
      setDisplay(out);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, duration]);

  return (
    <span ref={fadeRef} className={className}>
      {display}
    </span>
  );
}

type Row = Record<string, unknown>;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const zeroed = <T extends Row>(rows: T[]) => rows.map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, isNum(v) ? 0 : v])) as T);

/**
 * Chart data whose numbers glide from what is currently drawn to the new values (rows are matched by `idKey`; new rows
 * and the first render grow from zero). Use it with the chart's own animation switched off, so bars and lines move from
 * the previous value instead of restarting from zero. Changing `resetKey` (e.g. switching tabs) restarts from zero.
 */
export function useTweenedRows<T extends Row>(rows: T[], idKey: keyof T = 'period', resetKey = '', duration = 700): T[] {
  const [state, setState] = useState<{ key: string; rows: T[] }>(() => ({ key: resetKey, rows: zeroed(rows) }));
  const shown = useRef(state);
  const latest = useRef(rows);
  latest.current = rows;
  const signature = JSON.stringify(rows);

  useEffect(() => {
    const target = latest.current;
    const from = shown.current.key === resetKey ? shown.current.rows : zeroed(target);
    if (prefersReducedMotion()) {
      shown.current = { key: resetKey, rows: target };
      setState(shown.current);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      const next = t === 1 ? target : target.map((row) => {
        const prev = from.find((item) => item[idKey] === row[idKey]);
        return Object.fromEntries(Object.entries(row).map(([k, v]) => {
          if (!isNum(v)) return [k, v];
          const base = prev && isNum(prev[k]) ? (prev[k] as number) : 0;
          return [k, base + (v - base) * e];
        })) as T;
      });
      shown.current = { key: resetKey, rows: next };
      setState(shown.current);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [signature, idKey, resetKey, duration]);

  return state.key === resetKey ? state.rows : zeroed(rows);
}

/** Eased 0 → 1 progress that restarts whenever `resetKey` changes (jumps straight to 1 under reduced motion). */
export function useProgress(resetKey: string, duration = 900) {
  const [state, setState] = useState({ key: resetKey, value: 0 });
  useEffect(() => {
    if (prefersReducedMotion()) {
      setState({ key: resetKey, value: 1 });
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setState({ key: resetKey, value: 1 - Math.pow(1 - t, 3) });
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [resetKey, duration]);
  return state.key === resetKey ? state.value : 0;
}
