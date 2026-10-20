"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { StatusControls } from "@/components/status-controls";
import type { ReelCard } from "@/lib/db/types";
import { compact, igEmbed } from "@/lib/format";

const LANE: Record<string, string> = { viral: "🔥", rising: "📈", trending: "⚡", queue: "✋" };

// Каталог как полка в iTunes: обложки сеткой, нажал — карточка раскрылась поверх.
export function ReelCatalog({ reels }: { reels: ReelCard[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = reels.find((r) => r.id === openId) ?? null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {reels.map((r, i) => (
          <motion.button
            key={r.id}
            layoutId={`tile-${r.id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i * 0.04, 0.4) } }}
            whileHover={{ y: -4 }}
            onClick={() => setOpenId(r.id)}
            className="group relative aspect-[9/16] overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] text-left"
          >
            <Cover reel={r} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            <div className="absolute top-2 left-2 flex items-center gap-1">
              <StatusBadge status={r.status} />
            </div>
            {r.fitScore != null && (
              <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-amber-200 backdrop-blur">{r.fitScore}</span>
            )}
            <div className="absolute inset-x-0 bottom-0 space-y-1 p-3">
              <p className="text-xs font-semibold text-amber-200">{r.lanes.map((l) => LANE[l]).join(" ")} {compact(r.views)}</p>
              <p className="line-clamp-3 text-sm leading-snug font-semibold">{r.summary?.hook ?? r.caption ?? r.url}</p>
              <p className="text-xs text-white/50">@{r.author}</p>
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenId(null)}
            className="fixed inset-0 z-40 overflow-y-auto bg-black/70 p-3 backdrop-blur-md md:p-8"
          >
            <motion.article
              layoutId={`tile-${open.id}`}
              onClick={(e) => e.stopPropagation()}
              className="relative mx-auto grid max-w-5xl gap-5 overflow-hidden rounded-3xl glass-strong p-4 md:grid-cols-[320px_1fr] md:p-6"
            >
              <button onClick={() => setOpenId(null)} className="absolute top-3 right-3 z-10 grid size-8 place-items-center rounded-full bg-white/10 text-sm hover:bg-white/20" aria-label="Закрыть">✕</button>
              <Original reel={open} />
              <Details reel={open} />
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Cover({ reel }: { reel: ReelCard }) {
  if (reel.coverUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={reel.coverUrl} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105" />;
  }
  return <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.10),rgba(255,255,255,0.02)_60%)]" />;
}

function Original({ reel }: { reel: ReelCard }) {
  const embed = igEmbed(reel.url);
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-widest text-muted uppercase">Оригинал</p>
      {embed ? (
        <iframe src={embed} className="aspect-[9/16] w-full rounded-2xl bg-white" loading="lazy" allowFullScreen title="Оригинал в Instagram" />
      ) : (
        <div className="relative aspect-[9/16] overflow-hidden rounded-2xl"><Cover reel={reel} /></div>
      )}
      <a href={reel.url} target="_blank" rel="noreferrer" className="block text-center text-xs text-muted hover:text-foreground">Открыть в Instagram ↗</a>
    </div>
  );
}

function Details({ reel }: { reel: ReelCard }) {
  const s = reel.summary;
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="space-y-2 pr-8">
        <p className="text-sm text-muted">
          @{reel.author} · <span className="font-semibold text-amber-200">{compact(reel.views)}</span> просмотров · {compact(reel.likes)} лайков
        </p>
        <h2 className="font-display text-xl leading-snug font-semibold">«{s?.hook ?? reel.caption}»</h2>
        {s && <p className="text-sm leading-relaxed text-white/75">{s.concept}</p>}
      </div>

      {s && s.mechanic.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold tracking-widest text-muted uppercase">Что берём из залёта</p>
          <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
            <div className="grid grid-cols-[6.5rem_1fr_1fr] bg-white/[0.04] px-3 py-2 text-xs text-muted">
              <span />
              <span>У них</span>
              <span className="text-amber-200">У тебя</span>
            </div>
            {s.mechanic.map((m) => (
              <div key={m.element} className="grid grid-cols-[6.5rem_1fr_1fr] gap-3 border-t border-white/[0.05] px-3 py-2.5 text-sm">
                <span className="font-medium text-muted">{m.element}</span>
                <span className="text-white/70">{m.theirs}</span>
                <span>{m.yours}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {s && (
        <div>
          <p className="mb-2 text-xs font-semibold tracking-widest text-muted uppercase">Почему залетело</p>
          <ul className="space-y-1.5 text-sm leading-relaxed">
            {s.why.map((w, i) => <li key={i} className="flex gap-2"><span className="text-amber-300">•</span>{w}</li>)}
          </ul>
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
        <StatusControls id={reel.id} status={reel.status} />
        <Link href={`/reels/${reel.id}`} className="rounded-xl bg-white/[0.06] px-4 py-2 text-sm font-medium hover:bg-white/[0.12]">
          Сценарий и 3D-раскадровка →
        </Link>
      </div>
    </div>
  );
}
