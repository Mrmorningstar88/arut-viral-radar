"use client";

import { useState, useTransition } from "react";
import { approveScript, approveStoryboard, redoScript, redoStoryboard, rejectScript } from "@/app/studio/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { Stage } from "@/lib/studio/schema";

type Act = (id: string) => Promise<{ error?: string }>;
type Redo = (id: string, feedback: string) => Promise<{ error?: string }>;

const CONFIG: Partial<Record<Stage, { yes: string; yesAct: Act; yesToast: string; redo: Redo; redoLabel: string }>> = {
  script: { yes: "Да, рисуй сториборд", yesAct: approveScript, yesToast: "Рисую сториборд, около минуты", redo: redoScript, redoLabel: "Переписать сценарий" },
  storyboard: { yes: "Да, в производство", yesAct: approveStoryboard, yesToast: "Отправил в производство", redo: redoStoryboard, redoLabel: "Переделать сториборд" },
};

export function StageActions({ id, stage, busy }: { id: string; stage: Stage; busy: boolean }) {
  const [pending, start] = useTransition();
  const [redoOpen, setRedoOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const toast = useToast();
  const c = CONFIG[stage];
  if (!c) return null;

  const run = (fn: () => Promise<{ error?: string }>, ok: string) =>
    start(async () => {
      const r = await fn();
      if (r.error) toast(r.error, "error");
      else toast(ok);
    });

  return (
    <div className="space-y-3 rounded-3xl glass-strong p-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={pending || busy} onClick={() => run(() => c.yesAct(id), c.yesToast)}>
          ✓ {c.yes}
        </Button>
        <Button disabled={pending || busy} onClick={() => setRedoOpen((v) => !v)}>
          ↻ {c.redoLabel}
        </Button>
        <Button variant="danger" disabled={pending || busy} onClick={() => run(() => rejectScript(id), "Убрал в отклонённые")}>
          ✕ Не надо
        </Button>
      </div>
      {redoOpen && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            autoFocus
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Что поменять: короче, другой хук, больше юмора…"
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-amber-400/50"
          />
          <Button
            variant="primary"
            disabled={pending || busy}
            onClick={() =>
              run(async () => {
                const r = await c.redo(id, feedback);
                if (!r.error) {
                  setFeedback("");
                  setRedoOpen(false);
                }
                return r;
              }, "Переделываю, около минуты")
            }
            className="shrink-0"
          >
            Переделать
          </Button>
        </div>
      )}
    </div>
  );
}
