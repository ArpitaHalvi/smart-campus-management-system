import { useEffect, useRef, useState } from "react";

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * `true` once the element has scrolled into view (and stays true), so charts
 * can play their entrance when the student actually sees them.
 */
export function useInView(threshold = 0.25) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(() => reducedMotion());

  useEffect(() => {
    if (seen) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      const id = setTimeout(() => setSeen(true), 0);
      return () => clearTimeout(id);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [seen, threshold]);

  return [ref, seen];
}

/** Counts from 0 up to `target` once `active`, easing out. Jumps straight there for reduced motion. */
export function useCountUp(target, active, duration = 1100, decimals = 0) {
  const [value, setValue] = useState(() => (reducedMotion() ? target : 0));

  useEffect(() => {
    if (!active || reducedMotion()) return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4); // ease-out quart
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);

  const shown = reducedMotion() ? target : active ? value : 0;
  return Number(shown.toFixed(decimals));
}

/** The width of an element in px, kept current as it resizes (for crisp SVG charts). */
export function useElementWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

/** The current time, refreshed every `ms`, so "now" markers stay honest. */
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
