"use client";

import { useTransition } from "react";
import { approveScript, approveStoryboard, rejectScript, restoreScript } from "@/app/studio/actions";
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
  const btn = "flex-1 rounded-xl py-1.5 text-xs font-medium transition disabled:opacity-40";

  if (stage === "script")
    return (
      <div className="mt-2 flex gap-1.5">
        <button disabled={pending} onClick={() => run(() => approveScript(id), "Одобрено, рисую сториборд")} className={`${btn} bg-accent/15 text-[#4b57e8] hover:bg-accent/25`}>
          ✓ Одобрить
        </button>
        <button disabled={pending} onClick={() => run(() => rejectScript(id), "Отклонено")} className={`${btn} bg-ink/[0.05] text-muted hover:text-foreground`}>
          ✕ Отклонить
        </button>
      </div>
    );
  if (stage === "storyboard")
    return (
      <div className="mt-2 flex gap-1.5">
        <button disabled={pending} onClick={() => run(() => approveStoryboard(id), "Отправил в производство")} className={`${btn} bg-accent/15 text-[#4b57e8] hover:bg-accent/25`}>
          ✓ В производство
        </button>
      </div>
    );
  if (stage === "rejected")
    return (
      <button disabled={pending} onClick={() => run(() => restoreScript(id), "Вернул в сценарии")} className="shrink-0 rounded-full bg-ink/[0.06] px-3 py-1 text-xs hover:bg-ink/[0.1] disabled:opacity-40">
        ↩ Вернуть
      </button>
    );
  return null;
}
