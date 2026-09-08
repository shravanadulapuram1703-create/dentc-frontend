// Sizes a container to fill the viewport below its own top edge, so the
// inbox/log gets a fixed, scroll-inside frame regardless of how tall the
// patient header + secondary nav above it happen to be.

import { useLayoutEffect, useRef, useState } from "react";

export function useFillHeight(min = 520) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      setHeight(Math.max(min, window.innerHeight - top));
    };
    measure();
    window.addEventListener("resize", measure);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && el.parentElement) ro.observe(el.parentElement);
    return () => {
      window.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, [min]);

  return { ref, style: height ? { height } : undefined };
}
