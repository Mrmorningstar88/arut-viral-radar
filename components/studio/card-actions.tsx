"use client";

import { useTransition } from "react";
import Link from "next/link";
import { approveScript, rejectScript, restoreScript } from "@/app/studio/actions";
import { useToast } from "@/components/ui/toast";
import type { Stage } from "@/lib/studio/schema";

// Быстрые кнопки прямо на карточке: пачку из 30 сценариев можно разобрать, не открывая каждый.
export function CardActions({ id, stage }: { id: string; stage: Stage }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const run = (fn: () => Promise<{ error?: string }>, ok: string) =>
    start(async () => {
      const r = await fn();
      toast(r.error ?? ok, r.error ? "error" : undefined);
    });
  const btn = "min-h-10 flex-1 whitespace-nowrap rounded-xl px-2 text-xs font-medium disabled:opacity-40";

  if (stage === "script")
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={pending} onClick={() => run(() => approveScript(id), "Одобрено, рисую сториборд")} className={`${btn} neo-primary text-white`}>
          ✓ Одобрить
        </button>
        <button disabled={pending} onClick={() => run(() => rejectScript(id), "Отклонено")} className={`${btn} neo-btn text-muted hover:text-foreground`}>
          ✕ Отклонить
        </button>
      </div>
    );
  if (stage === "storyboard")
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`/studio/${id}?launch=1`} className={`${btn} neo-primary inline-flex items-center justify-center text-white`}>
          ▶ Стиль и запуск
        </Link>
      </div>
    );
  if (stage === "rejected")
    return (
      <button disabled={pending} onClick={() => run(() => restoreScript(id), "Вернул в сценарии")} className="min-h-9 shrink-0 rounded-full neo-btn px-3 text-xs disabled:opacity-40">
        ↩ Вернуть
      </button>
    );
  return null;
}
