"use client";

import { useState, useTransition } from "react";
import { approveScript, approveStoryboard, redoScript, redoStoryboard, rejectForever, rejectScript, restoreScript, type ScriptEdit } from "@/app/studio/actions";
import { ScriptEditor } from "@/components/studio/script-editor";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { Stage } from "@/lib/studio/schema";

type Act = (id: string) => Promise<{ error?: string }>;
type Redo = (id: string, feedback: string) => Promise<{ error?: string }>;

const CONFIG: Partial<Record<Stage, { yes: string; yesAct: Act; yesToast: string; redo: Redo; redoLabel: string }>> = {
  script: { yes: "Одобрить", yesAct: approveScript, yesToast: "Рисую сториборд, около минуты", redo: redoScript, redoLabel: "Переписать с Claude" },
  storyboard: { yes: "Да, в производство", yesAct: approveStoryboard, yesToast: "Отправил в производство", redo: redoStoryboard, redoLabel: "Переделать сториборд" },
};

export function StageActions({ id, stage, busy, edit }: { id: string; stage: Stage; busy: boolean; edit: ScriptEdit }) {
  const [pending, start] = useTransition();
  const [redoOpen, setRedoOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const toast = useToast();
  const c = CONFIG[stage];

  const run = (fn: () => Promise<{ error?: string }>, ok: string) =>
    start(async () => {
      const r = await fn();
      if (r.error) toast(r.error, "error");
      else toast(ok);
    });

  if (stage === "rejected")
    return (
      <div className="rounded-3xl glass-strong p-4">
        <Button disabled={pending} onClick={() => run(() => restoreScript(id), "Вернул в сценарии")}>
          ↩ Вернуть в сценарии
        </Button>
      </div>
    );
  if (!c) return null;
  if (editing) return <div className="rounded-3xl glass-strong p-4"><ScriptEditor id={id} initial={edit} onDone={() => setEditing(false)} /></div>;

  return (
    <div className="space-y-3 rounded-3xl glass-strong p-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={pending || busy} onClick={() => run(() => c.yesAct(id), c.yesToast)}>
          ✓ {c.yes}
        </Button>
        <Button disabled={pending || busy} onClick={() => setRedoOpen((v) => !v)}>
          ↻ {c.redoLabel}
        </Button>
        {stage === "script" && (
          <Button disabled={pending || busy} onClick={() => setEditing(true)}>
            ✎ Изменить
          </Button>
        )}
        <Button variant="danger" disabled={pending || busy} onClick={() => run(() => rejectScript(id), "Отклонено, можно вернуть под доской")}>
          ✕ Отклонить
        </Button>
        {stage === "script" && (
          <Button variant="danger" disabled={pending || busy} onClick={() => run(() => rejectForever(id), "Убрал навсегда, похожие больше не предложу")}>
            ⨯ Навсегда
          </Button>
        )}
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
