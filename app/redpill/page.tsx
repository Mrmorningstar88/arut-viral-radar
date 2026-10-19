import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { StatusControls } from "@/components/status-controls";
import { Reveal } from "@/components/ui/reveal";
import { getRepo } from "@/lib/db";
import { dubaiDate } from "@/lib/format";

export default async function RedPillPage() {
  const items = await (await getRepo()).listRedpill();

  return (
    <div className="space-y-6">
      <Reveal>
        <h1 className="font-display text-2xl font-semibold">Red Pill</h1>
        <p className="mt-1 text-sm text-muted">Один подтверждённый сюжет каждое утро в 09:00 по Дубаю: что происходило на самом деле, пока все смотрели в другую сторону. Только факты с первоисточниками.</p>
      </Reveal>

      {items.length === 0 && (
        <Reveal className="rounded-3xl border border-dashed border-white/10 p-12 text-center text-muted">Первый сюжет появится после утреннего прогона.</Reveal>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.06}>
            <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-rose-500/[0.07] via-white/[0.02] to-transparent p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-400/30 hover:shadow-[0_20px_60px_-30px_rgba(244,63,94,0.45)]">
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={p.status} />
                <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-medium text-rose-300">💊 {dubaiDate(p.createdAt)}</span>
              </div>
              <Link href={`/redpill/${p.id}`} className="mt-3 block font-display text-lg leading-snug font-semibold after:absolute after:inset-0 hover:text-rose-200">
                {p.title}
              </Link>
              {p.era && <p className="mt-1 text-xs text-muted">{p.era}</p>}
              {p.distraction && (
                <p className="mt-4 text-sm leading-relaxed text-white/75"><span className="text-muted">Пока все смотрели: </span>{p.distraction}</p>
              )}
              <div className="relative z-10 mt-auto pt-5">
                <StatusControls id={p.id} status={p.status} kind="redpill" />
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
