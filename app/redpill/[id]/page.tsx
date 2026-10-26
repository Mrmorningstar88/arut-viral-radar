import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryboardStudio } from "@/components/previz/storyboard-studio";
import { StatusBadge } from "@/components/status-badge";
import { StatusControls } from "@/components/status-controls";
import { CopyButton } from "@/components/ui/copy-button";
import { Panel, Row } from "@/components/ui/panel";
import { Reveal } from "@/components/ui/reveal";
import { Segmented } from "@/components/ui/segmented";
import { getRepo } from "@/lib/db";
import { dubaiDate } from "@/lib/format";

const host = (url: string) => URL.parse(url)?.hostname ?? url;

const SOURCE_KIND = { court: "суд", official: "официальный документ", peer_reviewed: "научная статья", primary_document: "первоисточник" } as const;

export default async function RedPillStoryPage({ params, searchParams }: PageProps<"/redpill/[id]">) {
  const { id } = await params;
  const lang = (await searchParams).lang === "en" ? "en" : "ru";
  const item = await (await getRepo()).getRedpill(id);
  if (!item) notFound();

  const s = item.story;
  const a = s?.i18n[lang];

  return (
    <article className="space-y-8">
      <Reveal className="space-y-4">
        <Link href="/redpill" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">← Все сюжеты</Link>
        <div className="flex flex-wrap items-start gap-5">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={item.status} />
              <span className="text-sm text-muted">💊 {dubaiDate(item.createdAt)}</span>
              {item.publishedUrl && <a href={item.publishedUrl} target="_blank" rel="noreferrer" className="text-sm text-emerald-300 underline-offset-4 hover:underline">Твой ролик ↗</a>}
            </div>
            <h1 className="font-display text-2xl leading-tight font-semibold md:text-3xl">{a?.title ?? item.title}</h1>
            {a && <p className="text-sm text-muted">{a.era}</p>}
          </div>
          <Segmented
            id="lang"
            size="sm"
            items={[
              { href: `/redpill/${id}?lang=ru`, label: "RU", active: lang === "ru" },
              { href: `/redpill/${id}?lang=en`, label: "EN", active: lang === "en" },
            ]}
          />
        </div>
        <StatusControls id={item.id} status={item.status} kind="redpill" />
      </Reveal>

      {!a || !s ? (
        <p className="text-muted">Сюжет ещё не готов.</p>
      ) : (
        <>
          <Reveal delay={0.05} className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
            <Panel title="Что было на самом деле">
              <p className="mb-4 rounded-2xl bg-ink/[0.03] p-3 text-sm leading-relaxed"><span className="text-muted">Пока все смотрели: </span>{a.distraction}</p>
              <ol className="space-y-3">
                {a.facts.map((f, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-rose-400/15 text-xs font-semibold text-rose-300">{i + 1}</span>
                    <span className="leading-relaxed">{f}</span>
                  </li>
                ))}
              </ol>
            </Panel>
            <Panel title="Адаптация">
              <p className="rounded-2xl glass p-4 text-lg leading-snug font-semibold">«{a.adaptation.hook}»</p>
              <dl className="mt-4 space-y-2 text-sm">
                <Row k="Концепт" v={a.adaptation.concept} />
                <Row k="Формат" v={a.adaptation.format} />
                <Row k="CTA" v={a.adaptation.cta} />
              </dl>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink/[0.05] px-3 py-1 font-mono text-sm tracking-widest">{a.adaptation.keyword}</div>
            </Panel>
          </Reveal>

          <Reveal delay={0.1}>
            <Panel title="Источники" subtitle="Каждый факт выше опирается на один из них. Проверь перед съёмкой">
              <ul className="grid gap-2 md:grid-cols-2">
                {s.sources.map((src) => (
                  <li key={src.url}>
                    <a href={src.url} target="_blank" rel="noreferrer" className="flex h-full flex-col gap-1 rounded-2xl border border-ink/[0.07] bg-ink/[0.02] p-3 transition-colors hover:border-rose-300/30 hover:bg-ink/[0.04]">
                      <span className="text-xs text-rose-300">{SOURCE_KIND[src.kind]}</span>
                      <span className="text-sm leading-snug">{src.title} ↗</span>
                      <span className="truncate text-xs text-muted">{host(src.url)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Panel>
          </Reveal>

          <Reveal delay={0.15}>
            <Panel title="Раскадровка" subtitle="3D-превью из простых фигур: камера, план и подача по каждому кадру">
              <StoryboardStudio storyboard={a.adaptation.storyboard} vo={a.adaptation.vo} />
            </Panel>
          </Reveal>

          <Reveal delay={0.2} className="grid gap-4 md:grid-cols-2">
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

          <Reveal delay={0.25}>
            <Panel title="Риски">
              <ul className="space-y-2">{a.risks.map((r, i) => <li key={i} className="flex gap-2 text-sm"><span className="text-rose-300">⚠</span>{r}</li>)}</ul>
            </Panel>
          </Reveal>
        </>
      )}
    </article>
  );
}
