import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { StatusBadge } from "@/components/status-badge";
import { StatusControls } from "@/components/status-controls";
import { getRepo } from "@/lib/db";
import { compact, dubaiDate } from "@/lib/format";

export default async function ReelPage({ params, searchParams }: PageProps<"/reels/[id]">) {
  const { id } = await params;
  const lang = (await searchParams).lang === "en" ? "en" : "ru";
  const reel = await (await getRepo()).getReel(id);
  if (!reel) notFound();

  const a = reel.analysis?.i18n[lang];
  const allPrompts = a?.adaptation.storyboard.map((s) => `${s.n}. ${s.prompt}`).join("\n\n") ?? "";

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <Link href="/reels" className="text-sm text-muted">← Все ролики</Link>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={reel.status} />
          <a href={reel.url} target="_blank" rel="noreferrer" className="text-sm underline">Оригинал @{reel.author}</a>
          {reel.publishedUrl && <a href={reel.publishedUrl} target="_blank" rel="noreferrer" className="text-sm underline">Твой ролик</a>}
          <span className="ml-auto flex gap-1 text-sm">
            <LangLink id={id} lang="ru" active={lang === "ru"} />
            <LangLink id={id} lang="en" active={lang === "en"} />
          </span>
        </div>
        <h1 className="text-xl font-semibold">{reel.caption}</h1>
        <p className="text-sm text-muted">
          {compact(reel.views)} просмотров · {compact(reel.likes)} лайков · {compact(reel.comments)} комментов · {dubaiDate(reel.postedAt)}
        </p>
        <StatusControls id={reel.id} status={reel.status} />
      </header>

      {!a ? (
        <p className="text-muted">Разбор ещё не готов.</p>
      ) : (
        <>
          <Section title="Почему залетело">
            <ul className="list-disc space-y-1 pl-5">{a.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </Section>

          <Section title="Адаптация">
            <dl className="grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
              <dt className="text-muted">Концепт</dt><dd>{a.adaptation.concept}</dd>
              <dt className="text-muted">Формат</dt><dd>{a.adaptation.format}</dd>
              <dt className="text-muted">Хук</dt><dd className="font-medium">{a.adaptation.hook}</dd>
              <dt className="text-muted">Ключевое слово</dt><dd className="font-mono">{a.adaptation.keyword}</dd>
              <dt className="text-muted">CTA</dt><dd>{a.adaptation.cta}</dd>
            </dl>
          </Section>

          <Section title="Сценарий (голос)">
            <ol className="space-y-2">
              {a.adaptation.vo.map((v, i) => (
                <li key={i} className="flex gap-3"><span className="w-14 shrink-0 font-mono text-xs text-muted">{v.t} с</span><span>{v.text}</span></li>
              ))}
            </ol>
          </Section>

          <Section title="Сториборд" action={<CopyButton text={allPrompts} />}>
            <div className="grid gap-3 sm:grid-cols-2">
              {a.adaptation.storyboard.map((s) => (
                <div key={s.n} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex justify-between text-xs text-muted"><span>Кадр {s.n}</span><span>{s.dur} с</span></div>
                  <p className="mt-1">{s.frame}</p>
                  <p className="mt-1 font-medium">«{s.overlay}»</p>
                  <div className="mt-2 rounded bg-foreground/5 p-2 font-mono text-xs">{s.prompt}</div>
                  <div className="mt-1 text-right"><CopyButton text={s.prompt} /></div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Подпись" action={<CopyButton text={a.adaptation.caption} />}>
            <p>{a.adaptation.caption}</p>
          </Section>

          <Section title="Экспертный слой">
            <dl className="grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
              <dt className="text-muted">Рынки</dt><dd>{a.expert.markets}</dd>
              <dt className="text-muted">Макро</dt><dd>{a.expert.macro}</dd>
              <dt className="text-muted">Политика</dt><dd>{a.expert.politics}</dd>
            </dl>
          </Section>

          <Section title="Риски">
            <ul className="list-disc space-y-1 pl-5">{a.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </Section>

          <p className="text-sm text-muted">{a.note}</p>
        </>
      )}
    </article>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">{title}</h2>{action}</div>
      {children}
    </section>
  );
}

function LangLink({ id, lang, active }: { id: string; lang: "ru" | "en"; active: boolean }) {
  return (
    <Link href={`/reels/${id}?lang=${lang}`} className={`rounded px-2 py-0.5 ${active ? "bg-foreground text-background" : "text-muted"}`}>
      {lang.toUpperCase()}
    </Link>
  );
}
