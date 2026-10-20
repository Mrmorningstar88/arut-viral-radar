"use client";

import { motion } from "motion/react";
import { useTransition } from "react";
import { runNow } from "@/app/actions";
import { useToast } from "@/components/ui/toast";

export function RunNowButton() {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.95 }}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const { error } = await runNow();
          if (error) toast(error, "error");
          else toast("Запустил поиск по твоим темам. Займёт 10–15 минут, разборы появятся здесь 🚀");
        })
      }
      className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-[0_8px_30px_-14px_rgba(255,255,255,0.45)] hover:bg-white/90 disabled:opacity-60"
    >
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <motion.span animate={pending ? { rotate: 360 } : { rotate: 0 }} transition={pending ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}>
        ◉
      </motion.span>
      <span className="relative">{pending ? "Запускаю…" : "Запустить сейчас"}</span>
    </motion.button>
  );
}
