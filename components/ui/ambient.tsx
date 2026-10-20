"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import { useEffect } from "react";

// Свет за стеклом: дрейфующие пятна, луч сверху и мягкий прожектор за курсором.
// Стекло выглядит стеклом, только когда за ним есть что размыть, поэтому свет здесь заметный.
export function Ambient() {
  const x = useSpring(useMotionValue(50), { stiffness: 40, damping: 20 });
  const y = useSpring(useMotionValue(30), { stiffness: 40, damping: 20 });
  const spot = useMotionTemplate`radial-gradient(600px circle at ${x}% ${y}%, rgba(255,255,255,0.075), transparent 60%)`;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x.set((e.clientX / window.innerWidth) * 100);
      y.set((e.clientY / window.innerHeight) * 100);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [x, y]);

  return (
    <div aria-hidden className="ambient pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute top-[-35%] left-1/2 h-[80vh] w-[70vw] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(255,255,255,0.13),transparent)] blur-2xl" />
      <div className="absolute -top-[20%] right-[-10%] size-[60vmax] rounded-full bg-white/[0.08] blur-[120px] [animation:drift_26s_ease-in-out_infinite]" />
      <div className="absolute top-[30%] -left-[15%] size-[45vmax] rounded-full bg-[#d8c7a6]/[0.09] blur-[120px] [animation:drift_32s_ease-in-out_infinite_reverse]" />
      <div className="absolute -bottom-[25%] left-[30%] size-[50vmax] rounded-full bg-white/[0.06] blur-[140px] [animation:drift_38s_ease-in-out_infinite]" />
      <div className="absolute top-[55%] right-[8%] size-[22vmax] rounded-full bg-[#d8c7a6]/[0.07] blur-[90px] [animation:drift_22s_ease-in-out_infinite_reverse]" />
      <motion.div style={{ background: spot }} className="absolute inset-0" />
      <div className="absolute inset-0 opacity-[0.03] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:3px_3px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55))]" />
    </div>
  );
}
