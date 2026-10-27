import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AutoRefresh } from "@/components/studio/auto-refresh";
import { GenerateScripts } from "@/components/studio/generate-button";
import { ProjectSwitcher } from "@/components/studio/project-switcher";
import { Landing } from "@/components/landing";
import { Reveal } from "@/components/ui/reveal";
import { currentUser, isAdmin } from "@/lib/auth/server";
import { PLANS, planOf, usage } from "@/lib/plans";
import { isDemo } from "@/lib/db";
import { currentWorkspace, listProjects } from "@/lib/projects";
import { STAGE_HINT, STAGE_LABEL, STAGES, type Stage } from "@/lib/studio/schema";
import { STAGE_TONE } from "@/lib/studio/stage-tone";
import { fmtMultiple, formatLabel } from "@/lib/formats/catalog";
import { listDeclined, listScripts, type Script } from "@/lib/studio/store";
import { CardActions } from "@/components/studio/card-actions";

// Генерация сценариев идёт в фоне после ответа.
export const maxDuration = 300;

export default async function Studio() {
  await connection();
  if (isDemo()) redirect("/reels");
  const user = await currentUser();
  if (!user) return <Landing />;
  const ws = await currentWorkspace(); // без проектов отправит в мастер первого запуска
  const plan = planOf(user);
  const [projects, scripts, used, declined] = await Promise.all([
    listProjects(),
    listScripts(ws).catch(() => null),
    plan === "admin" ? null : usage(user.id),
    listDeclined(ws).catch(() => []),
  ]);
  const project = projects.find((p) => p.id === ws);

  return (
    <div className="space-y-6">
      <Reveal>
        <ProjectSwitcher projects={projects} active={ws} />
      </Reveal>
      <Reveal delay={0.03} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-accent uppercase">Контент-завод</p>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">{project?.name ?? "Организация"}</h1>
          <p className="mt-1 text-sm text-muted">
            Сценарии строятся на механиках роликов, которые залетели в Instagram и TikTok. Ты только говоришь «да» или «переделай».{" "}
            <Link href="/formats" className="font-medium text-accent hover:underline">
              Какие форматы залетают →
            </Link>
          </p>
          {used && plan !== "admin" && (
            <Link href="/settings" className="mt-2 inline-flex items-center gap-2 rounded-full bg-ink/[0.05] px-3 py-1 text-xs text-muted hover:text-foreground">
              <span className="font-semibold text-foreground">{PLANS[plan].name}</span>
              сценариев в этом месяце: {used.scripts} из {PLANS[plan].limits.scripts}
              {plan === "free" && <span className="text-accent">· Хочу Pro</span>}
            </Link>
          )}
        </div>
        <GenerateScripts />
      </Reveal>

      {scripts === null ? (
        <Reveal className="rounded-3xl glass p-6 text-sm">
          {isAdmin(user) ? (
            <>
              Конвейеру нужна новая таблица в базе. Запусти в Supabase SQL Editor файл <b>supabase-update-3.sql</b> и обнови страницу.
            </>
          ) : (
            "Завод обновляется. Загляни через пару минут."
          )}
        </Reveal>
      ) : (
        <>
          <Board scripts={scripts} warming={scripts.length === 0 && !!project && justCreated(project.createdAt)} />
          {declined.length > 0 && <Declined items={declined} />}
        </>
      )}
    </div>
  );
}

// Проект создан мастером минуты назад: первые сценарии ещё пишутся.
const justCreated = (iso: string) => Date.now() - Date.parse(iso) < 5 * 60_000;

// warming: проект только что создан мастером, первые сценарии пишутся в фоне.
function Board({ scripts, warming }: { scripts: Script[]; warming: boolean }) {
  return (
    <>
      <AutoRefresh active={warming || scripts.some((s) => s.busy)} />
      {warming && (
        <div className="flex items-center gap-3 rounded-2xl bg-accent/10 px-4 py-3 text-sm ring-1 ring-accent/25">
          <span className="size-2 animate-ping rounded-full bg-accent" />
          Пишу первые сценарии для этой организации. Они появятся в первой колонке через минуту-две.
        </div>
      )}
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
        {STAGES.map((stage, i) => {
          const items = scripts.filter((s) => s.stage === stage);
          return (
            <Reveal key={stage} delay={0.04 * i} className="w-[78vw] max-w-sm shrink-0 snap-start lg:w-auto">
              <section className="flex h-full min-h-64 flex-col rounded-3xl glass p-3">
                <header className="mb-3 flex items-baseline justify-between px-1">
                  <div>
                    <h2 className="flex items-center gap-2 font-display text-xs font-semibold tracking-wide uppercase">
                      <span className={`size-2.5 rounded-full ${STAGE_TONE[stage].dot}`} />
                      {STAGE_LABEL[stage]}
                    </h2>
                    <p className="text-[11px] text-muted">{STAGE_HINT[stage]}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${STAGE_TONE[stage].chip}`}>{items.length}</span>
                </header>
                <div className="flex flex-1 flex-col gap-2">
                  {items.length === 0 ? (
                    <p className="m-auto px-4 py-8 text-center text-xs text-muted">{EMPTY[stage]}</p>
                  ) : (
                    items.map((s) => <Card key={s.id} s={s} />)
                  )}
                </div>
              </section>
            </Reveal>
          );
        })}
      </div>
    </>
  );
}

const EMPTY: Record<Stage, string> = {
  script: "Нажми «Новые сценарии»",
  storyboard: "Одобри сценарий, и здесь появится сториборд",
  production: "Пока пусто",
  ready: "Пока пусто",
  published: "Пока пусто",
  rejected: "",
};

function Card({ s }: { s: Script }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl neo-btn p-3 pl-4 before:absolute before:inset-y-3 before:left-0 before:w-1 before:rounded-r-full ${STAGE_TONE[s.stage].bar}`}>
      <Link href={`/studio/${s.id}`} className="block">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {s.pillar && <span className="text-[10px] font-semibold tracking-wider text-accent uppercase">{s.pillar}</span>}
          {s.payload.lang && s.payload.lang !== "ru" && (
            <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase text-muted">{s.payload.lang}</span>
          )}
          {s.payload.format && (
            <span className="rounded-full bg-st-prod/15 px-2 py-0.5 text-[10px] font-semibold text-st-prod-ink" title="Формат залёта-источника и его отрыв от медианы ниши">
              {formatLabel(s.payload.format)}
              {s.payload.formatX ? ` ${fmtMultiple(s.payload.formatX)}` : ""}
            </span>
          )}
        </span>
        <h3 className="mt-0.5 text-sm leading-snug font-semibold">{s.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{s.payload.hook}</p>
        {s.busy && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-accent">
            <span className="size-1.5 animate-ping rounded-full bg-accent" /> Claude работает…
          </p>
        )}
        {s.error && !s.busy && <p className="mt-2 text-[11px] text-rose-300">⚠ {s.error}</p>}
      </Link>
      {!s.busy && <CardActions id={s.id} stage={s.stage} />}
    </div>
  );
}

// Отклонённые «не сейчас»: свёрнуты под доской, любой можно вернуть.
function Declined({ items }: { items: Script[] }) {
  return (
    <details className="rounded-3xl glass p-4">
      <summary className="cursor-pointer text-sm text-muted">Отклонённые ({items.length})</summary>
      <ul className="mt-3 space-y-1.5">
        {items.map((s) => (
          <li key={s.id} className="flex items-center gap-3 rounded-xl bg-ink/[0.03] px-3 py-2 text-sm">
            <Link href={`/studio/${s.id}`} className="flex-1 truncate hover:text-accent">
              {s.title}
            </Link>
            <CardActions id={s.id} stage="rejected" />
          </li>
        ))}
      </ul>
    </details>
  );
}
