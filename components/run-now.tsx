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
      className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full neo-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${wide ? "w-full" : ""}`}
    >
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ink/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <span className="relative grid size-4 place-items-center">
        <span className={`absolute inset-0 rounded-full border border-ink/30 ${pending ? "animate-ping" : ""}`} />
        <span className="size-1.5 rounded-full bg-ink" />
      </span>
      <span className="relative">{pending ? "Запускаю…" : label}</span>
    </motion.button>
  );
}
