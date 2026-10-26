"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import { useEffect } from "react";

// Светлый фон неоморфизма: мягкие бело-голубые пятна медленно дрейфуют, за курсором едва заметный прожектор.
export function Ambient() {
  const x = useSpring(useMotionValue(50), { stiffness: 40, damping: 20 });
  const y = useSpring(useMotionValue(30), { stiffness: 40, damping: 20 });
  const spot = useMotionTemplate`radial-gradient(600px circle at ${x}% ${y}%, rgba(91,108,255,0.08), transparent 60%)`;

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
      <div className="absolute top-[-30%] left-1/2 h-[70vh] w-[70vw] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(255,255,255,0.9),transparent)] blur-2xl" />
      <div className="absolute -top-[20%] right-[-10%] size-[55vmax] rounded-full bg-[#8fa2ff]/[0.18] blur-[120px] [animation:drift_26s_ease-in-out_infinite]" />
      <div className="absolute top-[35%] -left-[15%] size-[45vmax] rounded-full bg-paper/70 blur-[120px] [animation:drift_32s_ease-in-out_infinite_reverse]" />
      <div className="absolute -bottom-[25%] left-[30%] size-[50vmax] rounded-full bg-[#b9a6ff]/[0.14] blur-[140px] [animation:drift_38s_ease-in-out_infinite]" />
      <motion.div style={{ background: spot }} className="absolute inset-0" />
    </div>
  );
}
