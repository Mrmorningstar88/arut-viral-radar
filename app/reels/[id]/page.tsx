import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryboardStudio } from "@/components/previz/storyboard-studio";
import { StatusBadge } from "@/components/status-badge";
import { StatusControls } from "@/components/status-controls";
import { CopyButton } from "@/components/ui/copy-button";
import { Panel, Row } from "@/components/ui/panel";
import { Reveal } from "@/components/ui/reveal";
import { ScoreRing } from "@/components/ui/score-ring";
import { Segmented } from "@/components/ui/segmented";
import { getRepo } from "@/lib/db";
import { compact, dubaiDate, igEmbed } from "@/lib/format";

export default async function ReelPage({ params, searchParams }: PageProps<"/reels/[id]">) {
  const { id } = await params;
  const lang = (await searchParams).lang === "en" ? "en" : "ru";
  const reel = await (await getRepo()).getReel(id);
  if (!reel) notFound();

  const a = reel.analysis?.i18n[lang];
  const embed = igEmbed(reel.url);

  return (
    <article className="space-y-8">
      <Reveal className="space-y-4">
        <Link href="/reels" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">← Все ролики</Link>
        <div className="flex flex-wrap items-start gap-5">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={reel.status} />
              <a href={reel.url} target="_blank" rel="noreferrer" className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline">Оригинал @{reel.author} ↗</a>
              {reel.publishedUrl && <a href={reel.publishedUrl} target="_blank" rel="noreferrer" className="text-sm text-emerald-300 underline-offset-4 hover:underline">Твой ролик ↗</a>}
            </div>
            <h1 className="font-display text-2xl leading-tight font-semibold md:text-3xl">{reel.caption}</h1>
            <p className="text-sm text-muted">
              <span className="font-semibold text-amber-200">{compact(reel.views)}</span> просмотров · {compact(reel.likes)} лайков · {compact(reel.comments)} комментов · {dubaiDate(reel.postedAt)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {reel.fitScore != null && <ScoreRing value={reel.fitScore} size={56} />}
            <Segmented
              id="lang"
              size="sm"
              items={[
                { href: `/reels/${id}?lang=ru`, label: "RU", active: lang === "ru" },
                { href: `/reels/${id}?lang=en`, label: "EN", active: lang === "en" },
              ]}
            />
          </div>
        </div>
        <StatusControls id={reel.id} status={reel.status} />
      </Reveal>

      {!a ? (
        <p className="text-muted">Разбор ещё не готов.</p>
      ) : (
        <>
          <Reveal delay={0.03}>
            <Panel title="Оригинал и что из него берём" subtitle={a.original?.summary}>
              <div className="grid gap-5 md:grid-cols-[280px_1fr]">
                {embed && <iframe src={embed} className="aspect-[9/16] w-full rounded-2xl bg-white" loading="lazy" allowFullScreen title="Оригинал в Instagram" />}
                <div className="space-y-5">
                  {a.original?.beats && (
                    <ol className="space-y-2 text-sm">
                      {a.original.beats.map((b, i) => (
                        <li key={i} className="grid grid-cols-[3.5rem_1fr] gap-3">
                          <span className="font-mono text-xs text-muted">{b.t} с</span>
                          <span>{b.what}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                  {a.original?.mechanic && (
                    <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
                      <div className="grid grid-cols-[6.5rem_1fr_1fr] bg-white/[0.04] px-3 py-2 text-xs text-muted">
                        <span />
                        <span>У них</span>
                        <span className="text-amber-200">У тебя</span>
                      </div>
                      {a.original.mechanic.map((m) => (
                        <div key={m.element} className="grid grid-cols-[6.5rem_1fr_1fr] gap-3 border-t border-white/[0.05] px-3 py-2.5 text-sm">
                          <span className="font-medium text-muted">{m.element}</span>
                          <span className="text-white/70">{m.theirs}</span>
                          <span>{m.yours}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {!a.original && <p className="text-sm text-muted">Этот разбор сделан до появления блока «оригинал». Новые ролики будут с ним.</p>}
                </div>
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={0.05} className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
            <Panel title="Почему залетело">
              <ol className="space-y-3">
                {a.why.map((w, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-amber-400/15 text-xs font-semibold text-amber-300">{i + 1}</span>
                    <span className="leading-relaxed">{w}</span>
                  </li>
                ))}
              </ol>
            </Panel>
            <Panel title="Адаптация">
              <p className="rounded-2xl bg-gradient-to-br from-amber-300/15 to-orange-500/5 p-4 text-lg leading-snug font-semibold ring-1 ring-amber-300/20">«{a.adaptation.hook}»</p>
              <dl className="mt-4 space-y-2 text-sm">
                <Row k="Концепт" v={a.adaptation.concept} />
                <Row k="Формат" v={a.adaptation.format} />
                <Row k="CTA" v={a.adaptation.cta} />
              </dl>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1 font-mono text-sm tracking-widest">{a.adaptation.keyword}</div>
            </Panel>
          </Reveal>

          <Reveal delay={0.1}>
            <Panel title="Твоя раскадровка" subtitle="Как это снять тебе: 3D-превью из простых фигур, камера, план и подача по каждому кадру">
              <StoryboardStudio storyboard={a.adaptation.storyboard} vo={a.adaptation.vo} />
            </Panel>
          </Reveal>

          <Reveal delay={0.15} className="grid gap-4 md:grid-cols-2">
            <Panel title="Подпись" action={<CopyButton text={a.adaptation.caption} />}>
              <p className="leading-relaxed">{a.adaptation.caption}</p>
            </Panel>
            <Panel title="Экспертный слой">
              <dl className="space-y-2 text-sm">
                <Row k="Рынки" v={a.expert.markets} />
                <Row k="Макро" v={a.expert.macro} />
                <Row k="Политика" v={a.expert.politics} />
              </dl>
            </Panel>
          </Reveal>

          <Reveal delay={0.2}>
            <Panel title="Риски">
              <ul className="space-y-2">{a.risks.map((r, i) => <li key={i} className="flex gap-2 text-sm"><span className="text-rose-300">⚠</span>{r}</li>)}</ul>
              <p className="mt-4 text-xs text-muted">{a.note}</p>
            </Panel>
          </Reveal>
        </>
      )}
    </article>
  );
}
