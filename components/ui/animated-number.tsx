"use client";

import { animate, useInView } from "motion/react";
import { useEffect, useRef } from "react";

// Число «докручивается» до значения, когда попадает в кадр.
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString("ru-RU"),
}: {
  value: number;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const from = useRef(0);
  const fmt = useRef(format);
  useEffect(() => {
    fmt.current = format;
  });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const controls = animate(from.current, value, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (n) => (node.textContent = fmt.current(n)),
    });
    from.current = value;
    return () => controls.stop();
  }, [inView, value]);
  return (
    <span ref={ref} className="tabular-nums">
      {format(0)}
    </span>
  );
}
