"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { reviseAdaptation } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type Line = { t: string; text: string };

const AREA = "w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-relaxed outline-none transition placeholder:text-white/30 focus:border-amber-400/50";

// Правка адаптации: свой хук и текст, а раскадровку и 3D-превью Claude пересобирает под них.
export function AdaptationEditor({ id, hook, vo }: { id: string; hook: string; vo: Line[] }) {
  const [open, setOpen] = useState(false);
  const [h, setH] = useState(hook);
  const [lines, setLines] = useState(vo);
  const [wish, setWish] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();

  const submit = () =>
    start(async () => {
      const r = await reviseAdaptation(id, { hook: h, vo: lines, instruction: wish });
      if (r.error) return toast(r.error, "error");
      setOpen(false);
      setWish("");
      toast("Пересобрал сценарий и раскадровку под твой текст 🎬");
    });

  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Хочешь по-своему?</p>
          <p className="text-sm text-muted">Поправь хук и текст, раскадровка и 3D-превью пересоберутся под них.</p>
        </div>
        {!open && <Button variant="primary" onClick={() => setOpen(true)}>✏️ Править</Button>}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-4 pt-5">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold tracking-widest text-muted uppercase">Хук</span>
                <textarea value={h} onChange={(e) => setH(e.target.value)} rows={2} className={AREA} />
              </label>
              <div className="space-y-1.5">
                <span className="text-xs font-semibold tracking-widest text-muted uppercase">Текст по секундам</span>
                {lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-[3.5rem_1fr] items-start gap-2">
                    <span className="pt-3 font-mono text-xs text-muted">{l.t} с</span>
                    <textarea
                      value={l.text}
                      onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                      rows={2}
                      className={AREA}
                    />
                  </div>
                ))}
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold tracking-widest text-muted uppercase">Что ещё поменять</span>
                <textarea value={wish} onChange={(e) => setWish(e.target.value)} rows={2} placeholder="Например: снимаю в машине, хук жёстче, без графиков, финал с вопросом к зрителю" className={AREA} />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" disabled={pending} onClick={submit}>{pending ? "Пересобираю… до 2 минут" : "Пересобрать раскадровку"}</Button>
                <button disabled={pending} onClick={() => { setOpen(false); setH(hook); setLines(vo); }} className="px-2 text-sm text-muted hover:text-foreground">Отмена</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
