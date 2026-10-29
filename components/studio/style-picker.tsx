"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { setStyle } from "@/app/studio/actions";
import { useToast } from "@/components/ui/toast";
import { StyleGallery } from "@/components/studio/style-gallery";
import { viewOf, type MyStyleCard } from "@/lib/studio/styles";

// Стиль ролика: свой из роликов автора или из библиотеки lemo-opuscar; текущий крупно, остальные в галерее.
export function StylePicker({ id, style, editable, mine: initialMine, redraws = false }: { id: string; style: string | null; editable: boolean; mine: MyStyleCard[]; redraws?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState(initialMine);
  const [pending, start] = useTransition();
  const toast = useToast();
  const current = viewOf(style, mine);

  return (
    <section id="style" className="scroll-mt-24 rounded-3xl glass p-5">
      <div className="flex flex-wrap items-center gap-4">
        {current && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.frame} alt={current.name} className="h-24 w-40 rounded-2xl object-cover ring-1 ring-ink/10" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-widest text-muted uppercase">Стиль ролика</p>
          <h2 className="font-display text-lg font-semibold">{current?.name ?? "Не выбран"}</h2>
          {current && <p className="text-sm text-muted">{current.sub}</p>}
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
              mine={mine}
              onMine={setMine}
              onPick={(slug) =>
                start(async () => {
                  const r = await setStyle(id, slug);
                  if (r.error) return toast(r.error, "error");
                  setOpen(false);
                  const name = viewOf(slug, mine)?.name ?? slug;
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
