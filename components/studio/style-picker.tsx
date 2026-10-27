"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { setStyle } from "@/app/studio/actions";
import { useToast } from "@/components/ui/toast";
import { OPUS_FRAME, OPUS_STYLES, styleBySlug } from "@/lib/studio/styles";

// Стиль ролика из библиотеки lemo-opuscar: текущий крупно, остальные в галерее по категориям.
export function StylePicker({ id, style, editable, redraws = false }: { id: string; style: string | null; editable: boolean; redraws?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const current = styleBySlug(style);
  const categories = [...new Set(OPUS_STYLES.map((s) => s.category))];

  return (
    <section id="style" className="scroll-mt-24 rounded-3xl glass p-5">
      <div className="flex flex-wrap items-center gap-4">
        {current && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={OPUS_FRAME(current.slug)} alt={current.name} className="h-24 w-40 rounded-2xl object-cover ring-1 ring-ink/10" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-widest text-muted uppercase">Стиль ролика</p>
          <h2 className="font-display text-lg font-semibold">{current?.name ?? "Не выбран"}</h2>
          {current && <p className="text-sm text-muted">{current.category} · {current.uses.join(", ")}</p>}
          {editable && <p className="mt-1 text-xs text-muted">Выбери до запуска: от стиля зависит, как будет выглядеть весь ролик.</p>}
        </div>
        {editable && (
          <button onClick={() => setOpen((v) => !v)} className="rounded-full glass-inset px-4 py-2 text-sm hover:bg-ink/[0.08]">
            {open ? "Свернуть" : "Сменить стиль"}
          </button>
        )}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            {categories.map((cat) => (
              <div key={cat} className="mt-5">
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{cat}</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {OPUS_STYLES.filter((s) => s.category === cat).map((s) => (
                    <button
                      key={s.slug}
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const r = await setStyle(id, s.slug);
                          if (r.error) return toast(r.error, "error");
                          setOpen(false);
                          toast(redraws ? `Стиль: ${s.name}. Перерисовываю кадры, около минуты` : `Стиль: ${s.name}`);
                        })
                      }
                      className={`group overflow-hidden rounded-2xl text-left ring-1 transition ${s.slug === style ? "ring-2 ring-accent" : "ring-ink/10 hover:ring-ink/30"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={OPUS_FRAME(s.slug)} alt="" loading="lazy" className="aspect-video w-full object-cover transition group-hover:scale-[1.03]" />
                      <span className="block px-2.5 py-2 text-xs font-medium">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="mt-4 text-[11px] text-muted">
              Стили и кадры: <a href="https://github.com/lemomo-ai/lemo-opuscar" target="_blank" rel="noreferrer" className="underline">lemo-opuscar</a> (CC BY 4.0).
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
