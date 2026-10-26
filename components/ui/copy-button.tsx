"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

export function CopyButton({ text, label = "Копировать" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
      className={`relative inline-flex h-7 items-center overflow-hidden rounded-lg px-2.5 text-xs font-medium transition-colors ${done ? "bg-emerald-500/15 text-emerald-300" : "bg-ink/[0.05] text-ink/70 hover:bg-ink/10 hover:text-ink"}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={done ? "d" : "c"} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.15 }}>
          {done ? "✓ Скопировано" : label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
