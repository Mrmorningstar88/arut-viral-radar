"use client";

import { useState, useTransition } from "react";
import { editScript, type ScriptEdit } from "@/app/studio/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const INPUT = "w-full rounded-xl border border-ink/10 bg-paper/30 px-3 py-2 text-sm outline-none focus:border-accent/60";

// Ручная правка сценария: хук, озвучка по строкам, надписи, подпись.
export function ScriptEditor({ id, initial, onDone }: { id: string; initial: ScriptEdit; onDone: () => void }) {
  const [e, setE] = useState<ScriptEdit>(initial);
  const [onScreen, setOnScreen] = useState(initial.onScreen.join("\n"));
  const [pending, start] = useTransition();
  const toast = useToast();
  const setVo = (i: number, patch: Partial<ScriptEdit["vo"][number]>) => setE((x) => ({ ...x, vo: x.vo.map((v, j) => (j === i ? { ...v, ...patch } : v)) }));

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-xs text-muted">Название</span>
        <input value={e.title} onChange={(ev) => setE({ ...e, title: ev.target.value })} className={INPUT} />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-muted">Хук (первые секунды)</span>
        <textarea rows={2} value={e.hook} onChange={(ev) => setE({ ...e, hook: ev.target.value })} className={`${INPUT} resize-none`} />
      </label>
      <div className="space-y-1">
        <span className="text-xs text-muted">Озвучка</span>
        {e.vo.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input value={v.t} onChange={(ev) => setVo(i, { t: ev.target.value })} className={`${INPUT} w-20 shrink-0 font-mono text-xs`} />
            <textarea rows={2} value={v.text} onChange={(ev) => setVo(i, { text: ev.target.value })} className={`${INPUT} resize-none`} />
            <button type="button" onClick={() => setE({ ...e, vo: e.vo.filter((_, j) => j !== i) })} className="px-1 text-muted hover:text-rose-300" aria-label="Удалить строку">
              ✕
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setE({ ...e, vo: [...e.vo, { t: "", text: "" }] })} className="text-xs text-accent hover:underline">
          + строка
        </button>
      </div>
      <label className="block space-y-1">
        <span className="text-xs text-muted">Надписи на экране (каждая с новой строки)</span>
        <textarea rows={3} value={onScreen} onChange={(ev) => setOnScreen(ev.target.value)} className={`${INPUT} resize-none`} />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-muted">Подпись к посту</span>
        <textarea rows={3} value={e.caption} onChange={(ev) => setE({ ...e, caption: ev.target.value })} className={`${INPUT} resize-none`} />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-muted">Призыв к действию</span>
        <input value={e.cta} onChange={(ev) => setE({ ...e, cta: ev.target.value })} className={INPUT} />
      </label>
      <div className="flex gap-2">
        <Button
          variant="primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await editScript(id, { ...e, onScreen: onScreen.split("\n") });
              if (r.error) return toast(r.error, "error");
              toast("Сохранил правки");
              onDone();
            })
          }
        >
          {pending ? "Сохраняю…" : "Сохранить"}
        </Button>
        <Button onClick={onDone}>Отмена</Button>
      </div>
    </div>
  );
}
