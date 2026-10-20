"use client";

import { motion } from "motion/react";
import { useTransition } from "react";
import { runNow } from "@/app/actions";
import { useToast } from "@/components/ui/toast";
import { readStored } from "@/lib/use-stored";

export const RUN_OPTIONS_KEY = "radar.run-options";

// Запуск поиска с настройками пульта: они сохраняются в браузере, кнопка берёт их в момент нажатия.
export function RunNowButton({ label = "Подтянуть топ", wide }: { label?: string; wide?: boolean }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.95 }}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const { error } = await runNow(readStored(RUN_OPTIONS_KEY));
          if (error) toast(error, "error");
          else toast("Запустил поиск. Займёт 10–15 минут, разборы появятся здесь");
        })
      }
      className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-[linear-gradient(180deg,#ff9a55,#ff7a2f_55%,#f06a20)] px-5 py-2.5 text-sm font-semibold text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-1px_0_rgba(0,0,0,0.18),0_10px_40px_-12px_rgba(255,122,47,0.75),0_0_0_1px_rgba(255,160,100,0.5)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_14px_54px_-10px_rgba(255,122,47,0.95),0_0_0_1px_rgba(255,180,130,0.7)] disabled:opacity-60 ${wide ? "w-full" : ""}`}
    >
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <span className="relative grid size-4 place-items-center">
        <span className={`absolute inset-0 rounded-full border border-black/70 ${pending ? "animate-ping" : ""}`} />
        <span className="size-1.5 rounded-full bg-black" />
      </span>
      <span className="relative">{pending ? "Запускаю…" : label}</span>
    </motion.button>
  );
}
