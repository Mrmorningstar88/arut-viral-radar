"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { setStyle } from "@/app/studio/actions";
import { useToast } from "@/components/ui/toast";
import { StyleGallery } from "@/components/studio/style-gallery";
import { OPUS_FRAME, styleBySlug } from "@/lib/studio/styles";

// Стиль ролика из библиотеки lemo-opuscar: текущий крупно, остальные в галерее по категориям.
export function StylePicker({ id, style, editable, redraws = false }: { id: string; style: string | null; editable: boolean; redraws?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const current = styleBySlug(style);

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
            <StyleGallery
              current={style}
              disabled={pending}
              onPick={(slug) =>
                start(async () => {
                  const r = await setStyle(id, slug);
                  if (r.error) return toast(r.error, "error");
                  setOpen(false);
                  const name = styleBySlug(slug)?.name ?? slug;
                  toast(redraws ? `Стиль: ${name}. Перерисовываю кадры, около минуты` : `Стиль: ${name}`);
                })
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
