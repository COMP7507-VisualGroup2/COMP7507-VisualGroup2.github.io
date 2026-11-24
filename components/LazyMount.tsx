'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  height: number;
  /** Render immediately on mount (only read on the first render). */
  eager?: boolean;
}

/** Defers rendering heavy charts until they scroll near the viewport. */
export default function LazyMount({ children, height, eager = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref} style={{ minHeight: height }}>
      {visible ? children : <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" style={{ height }} />}
    </div>
  );
}
