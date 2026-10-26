import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/studio/auto-refresh";
import { PublishForm, ReleaseForm, RetryRender } from "@/components/studio/ready-actions";
import { StageActions } from "@/components/studio/stage-actions";
import { StylePicker } from "@/components/studio/style-picker";
import { CopyButton } from "@/components/ui/copy-button";
import { Panel } from "@/components/ui/panel";
import { Reveal } from "@/components/ui/reveal";
import { requireUser } from "@/lib/auth/server";
import { linkOf, listBrands, NETWORKS } from "@/lib/metricool";
import { currentWorkspace } from "@/lib/projects";
import { STAGE_LABEL, STAGES } from "@/lib/studio/schema";
import { getScript } from "@/lib/studio/store";

// Действия на этой странице запускают Claude в фоне.
export const maxDuration = 300;

export default async function ScriptPage({ params }: PageProps<"/studio/[id]">) {
  const { id } = await params;
  const ws = await currentWorkspace(); // проверяет вход и доступ к организации
  const s = await getScript(ws, id);
  if (!s) notFound();
  const networks = s.stage === "ready" ? await releaseTargets(ws) : [];
  const p = s.payload;
  const rendering = s.stage === "production" && (s.renderStatus === "queued" || s.renderStatus === "rendering");
  const step = STAGES.indexOf(s.stage as (typeof STAGES)[number]);

  return (
    <article className="space-y-6">
      <AutoRefresh active={s.busy || rendering} every={s.busy ? 5000 : 20000} forMs={s.busy ? 180_000 : 3_600_000} />
      <Reveal className="space-y-4">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">← Завод</Link>
        <ol className="flex flex-wrap gap-1.5">
          {STAGES.map((st, i) => (
            <li
              key={st}
              className={`rounded-full px-3 py-1 text-xs ${i === step ? "bg-accent font-semibold text-white" : i < step ? "bg-ink/[0.08] text-foreground" : "bg-ink/[0.03] text-ink/30"}`}
            >
              {i < step ? "✓ " : ""}
              {STAGE_LABEL[st]}
            </li>
          ))}
          {s.stage === "rejected" && <li className="rounded-full bg-rose-500/20 px-3 py-1 text-xs text-rose-200">Отклонено</li>}
        </ol>
        <div>
          {s.pillar && <p className="text-xs font-semibold tracking-widest text-accent uppercase">{s.pillar}</p>}
          <h1 className="font-display text-2xl leading-tight font-semibold md:text-3xl">{s.title}</h1>
        </div>
        {s.busy && (
          <p className="flex items-center gap-2 rounded-2xl bg-accent/[0.08] px-4 py-3 text-sm text-accent">
            <span className="size-2 animate-ping rounded-full bg-accent" /> Claude работает над этой карточкой, страница обновится сама.
          </p>
        )}
        {s.error && !s.busy && <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">Не получилось: {s.error}</p>}
        <StageActions id={s.id} stage={s.stage} busy={s.busy} edit={{ title: s.title, hook: p.hook, vo: p.vo, onScreen: p.onScreen, caption: p.caption, cta: p.cta }} />
      </Reveal>

      {s.stage === "ready" && s.videoUrl && (
        <Reveal delay={0.03} className="grid gap-5 rounded-3xl glass p-5 md:grid-cols-[minmax(0,320px)_1fr]">
          <video src={s.videoUrl} controls playsInline className="aspect-[9/16] w-full rounded-2xl bg-black" />
          <div className="space-y-3">
            <h2 className="font-display text-sm font-semibold tracking-wide uppercase">Ролик готов</h2>
            <p className="text-sm text-muted">Посмотри. Нравится? Отметь площадки и выпусти.</p>
            <ReleaseForm id={s.id} networks={networks} />
            <details className="text-sm">
              <summary className="cursor-pointer text-xs text-muted">Выложить вручную</summary>
              <div className="mt-3">
                <PublishForm id={s.id} videoUrl={s.videoUrl} />
              </div>
            </details>
          </div>
        </Reveal>
      )}

      {s.stage === "published" && s.videoUrl && (
        <Reveal delay={0.03} className="flex flex-wrap items-center gap-5 rounded-3xl glass p-5">
          <video src={s.videoUrl} controls playsInline className="aspect-[9/16] w-40 rounded-2xl bg-black" />
          {s.renderLog && !s.publishedUrl && <p className="text-sm text-muted">{s.renderLog}</p>}
          {s.publishedUrl && <a href={s.publishedUrl} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">Пост в соцсети ↗</a>}
        </Reveal>
      )}

      {s.stage === "production" && (
        <Reveal delay={0.03} className="rounded-3xl glass p-5 text-sm leading-relaxed">
          <h2 className="font-display text-sm font-semibold tracking-wide uppercase">Производство</h2>
          {s.renderStatus === "failed" ? (
            <div className="mt-2 space-y-3">
              <p className="text-rose-200">Рендер не получился{s.error ? `: ${s.error}` : ""}.</p>
              <RetryRender id={s.id} />
            </div>
          ) : s.renderStatus === "rendering" ? (
            <p className="mt-2 flex items-start gap-2 text-muted">
              <span className="mt-1.5 size-2 shrink-0 animate-ping rounded-full bg-accent" />
              <span>Opuscar рисует ролик, обычно 30–60 минут.{s.renderLog && <span className="mt-1 block text-xs text-ink/50">{s.renderLog}</span>}</span>
            </p>
          ) : (
            <p className="mt-2 text-muted">Ролик в очереди на рендер. Как только освободится рендер-сервер, начнётся сборка, а готовое видео появится здесь.</p>
          )}
        </Reveal>
      )}

      {(s.style || s.payload.style) && (
        <Reveal delay={0.04}>
          <StylePicker id={s.id} style={s.style ?? s.payload.style} editable={s.stage === "script" || s.stage === "storyboard"} />
        </Reveal>
      )}

      {s.storyboard && (
        <Reveal delay={0.05}>
          <Panel title="Сториборд" subtitle={s.storyboard.music}>
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {s.storyboard.shots.map((sh) => (
                <li key={sh.n} className="flex flex-col rounded-2xl border border-ink/[0.06] bg-ink/[0.03] p-3">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span className="font-semibold text-foreground">Кадр {sh.n}</span>
                    <span className="tabular-nums">{sh.dur} с</span>
                  </div>
                  <p className="mt-2 flex-1 text-sm leading-relaxed">{sh.frame}</p>
                  {sh.overlay && <p className="mt-2 rounded-xl bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent">«{sh.overlay}»</p>}
                </li>
              ))}
            </ol>
          </Panel>
        </Reveal>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Reveal delay={0.06}>
          <Panel title="Хук" subtitle="Первые секунды">
            <p className="text-lg leading-snug font-semibold">{p.hook}</p>
            {p.sound && <p className="mt-3 rounded-xl bg-ink/[0.04] px-3 py-2 text-sm text-muted">🔊 {p.sound}</p>}
          </Panel>
        </Reveal>
        <Reveal delay={0.08}>
          <Panel title="Что взяли из залёта">
            <p className="text-sm leading-relaxed">{p.mechanic}</p>
            {s.sourceReelId && (
              <Link href={`/reels/${s.sourceReelId}`} className="mt-2 inline-block text-xs text-accent hover:underline">
                Открыть оригинал →
              </Link>
            )}
            <ul className="mt-3 space-y-1 text-sm text-muted">
              {p.whyItWorks.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          </Panel>
        </Reveal>
      </div>

      <Reveal delay={0.1}>
        <Panel title="Озвучка" action={<CopyButton text={p.vo.map((v) => v.text).join("\n")} />}>
          <ol className="space-y-2">
            {p.vo.map((v, i) => (
              <li key={i} className="grid grid-cols-[3.5rem_1fr] gap-3 text-sm">
                <span className="font-mono text-xs text-muted tabular-nums">{v.t}</span>
                <span className="leading-relaxed">{v.text}</span>
              </li>
            ))}
          </ol>
          {p.onScreen.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {p.onScreen.map((t) => (
                <span key={t} className="rounded-full bg-ink/[0.06] px-3 py-1 text-xs">{t}</span>
              ))}
            </div>
          )}
        </Panel>
      </Reveal>

      <Reveal delay={0.12}>
        <Panel title="Подпись к посту" action={<CopyButton text={`${p.caption}\n\n${p.cta}`} />}>
          <p className="text-sm leading-relaxed whitespace-pre-line">{p.caption}</p>
          <p className="mt-3 text-sm font-medium">{p.cta}</p>
        </Panel>
      </Reveal>
    </article>
  );
}

// Площадки, подключённые к организации через Metricool. Ошибка Metricool не должна ронять страницу.
async function releaseTargets(ws: string) {
  const link = linkOf(await requireUser());
  const blogId = link?.brands[ws];
  if (!link || !blogId) return [];
  const brand = (await listBrands(link).catch(() => [])).find((b) => b.blogId === blogId);
  return (brand?.networks ?? []).map((n) => ({ id: n, label: NETWORKS[n] }));
}
