"use client";

import { useState, useTransition } from "react";
import { approveScript, approveStoryboard, redoScript, redoStoryboard, rejectForever, rejectScript, restoreScript, type ScriptEdit } from "@/app/studio/actions";
import { ScriptEditor } from "@/components/studio/script-editor";
import { StyleGallery } from "@/components/studio/style-gallery";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { Stage } from "@/lib/studio/schema";
import { viewOf, type MyStyleCard } from "@/lib/studio/styles";

type Act = (id: string) => Promise<{ error?: string }>;
type Redo = (id: string, feedback: string) => Promise<{ error?: string }>;

const CONFIG: Partial<Record<Stage, { yes: string; yesAct: Act; yesToast: string; redo: Redo; redoLabel: string }>> = {
  script: { yes: "Одобрить", yesAct: approveScript, yesToast: "Рисую сториборд, около минуты", redo: redoScript, redoLabel: "Переписать с Claude" },
  storyboard: { yes: "Выбрать стиль и запустить", yesAct: approveStoryboard, yesToast: "Отправил в производство", redo: redoStoryboard, redoLabel: "Переделать сториборд" },
};

export function StageActions({ id, stage, busy, edit, style, mine: initialMine, launch = false }: { id: string; stage: Stage; busy: boolean; edit: ScriptEdit; style: string | null; mine: MyStyleCard[]; launch?: boolean }) {
  const [pending, start] = useTransition();
  const [redoOpen, setRedoOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  // launch: пришли с доски по кнопке «В производство», сразу открываем выбор стиля.
  const [confirm, setConfirm] = useState(launch && stage === "storyboard");
  const [picked, setPicked] = useState(style);
  const [mine, setMine] = useState(initialMine);
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

  // Перед рендером показываем, в каком стиле будет ролик, и даём сменить его: рендер долгий и стоит денег.
  if (confirm) {
    const st = viewOf(picked, mine);
    return (
      <div className="space-y-4 rounded-3xl glass-strong p-4">
        <div className="flex flex-wrap items-center gap-4">
          {st && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={st.frame} alt="" className="h-20 w-36 rounded-2xl object-cover ring-1 ring-ink/10" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-widest text-muted uppercase">Шаг перед производством: выбери стиль</p>
            <p className="font-display text-lg font-semibold">{st?.name ?? "Стиль не выбран"}</p>
            <p className="text-sm text-muted">Нажми на кадр, чтобы выбрать, или «▶ Пример», чтобы посмотреть, как выглядит готовый фильм. Рендер идёт 30–60 минут, его можно отменить.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={pending || busy || !st}
            onClick={() =>
              run(async () => {
                const r = await approveStoryboard(id, picked ?? undefined);
                if (!r.error) setConfirm(false);
                return r;
              }, "Запустил рендер")
            }
          >
            ▶ Запустить ролик{st ? ` в стиле ${st.name}` : ""}
          </Button>
          <Button disabled={pending} onClick={() => setConfirm(false)}>
            Назад
          </Button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto rounded-2xl pr-1">
          <StyleGallery current={picked} onPick={setPicked} disabled={pending} mine={mine} onMine={setMine} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-3xl glass-strong p-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={pending || busy} onClick={() => (stage === "storyboard" ? setConfirm(true) : run(() => c.yesAct(id), c.yesToast))}>
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
            className="w-full rounded-2xl border border-ink/10 bg-paper/30 px-4 py-2.5 text-sm outline-none placeholder:text-ink/30 focus:border-accent/50"
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
