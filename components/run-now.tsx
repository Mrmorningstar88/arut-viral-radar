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
      className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-amber-300 to-orange-500 px-5 py-2.5 text-sm font-semibold text-black shadow-[0_10px_30px_-10px_rgba(245,158,11,0.8)] disabled:opacity-60"
    >
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <motion.span animate={pending ? { rotate: 360 } : { rotate: 0 }} transition={pending ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}>
        ◉
      </motion.span>
      <span className="relative">{pending ? "Запускаю…" : "Запустить сейчас"}</span>
    </motion.button>
  );
}
