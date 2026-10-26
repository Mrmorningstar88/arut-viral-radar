import Link from "next/link";
import { redirect } from "next/navigation";
import { AutoRefresh } from "@/components/studio/auto-refresh";
import { GenerateScripts } from "@/components/studio/generate-button";
import { ProjectSwitcher } from "@/components/studio/project-switcher";
import { Reveal } from "@/components/ui/reveal";
import { getRepo, isDemo } from "@/lib/db";
import { currentWorkspace, listProjects } from "@/lib/projects";
import { STAGE_HINT, STAGE_LABEL, STAGES, type Stage } from "@/lib/studio/schema";
import { listScripts, type Script } from "@/lib/studio/store";

// Генерация сценариев идёт в фоне после ответа.
export const maxDuration = 300;

export default async function Studio() {
  if (isDemo()) redirect("/reels");
  await getRepo(); // проверяет вход владельца
  const ws = await currentWorkspace();
  const [projects, scripts] = await Promise.all([listProjects(), listScripts(ws).catch(() => null)]);
  const project = projects.find((p) => p.id === ws);

  return (
    <div className="space-y-6">
      <Reveal>
        <ProjectSwitcher projects={projects} active={ws} />
      </Reveal>
      <Reveal delay={0.03} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-[#ff7a2f] uppercase">Контент-завод</p>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">{project?.name ?? "Проект"}</h1>
          <p className="mt-1 text-sm text-muted">Сценарии строятся на механиках залётов из вкладки «Залёты». Ты только говоришь «да» или «переделай».</p>
        </div>
        <GenerateScripts />
      </Reveal>

      {scripts === null ? (
        <Reveal className="rounded-3xl glass p-6 text-sm">
          Конвейеру нужна новая таблица в базе. Запусти в Supabase SQL Editor файл <b>supabase-update-3.sql</b> и обнови страницу.
        </Reveal>
      ) : (
        <Board scripts={scripts} />
      )}
    </div>
  );
}

function Board({ scripts }: { scripts: Script[] }) {
  return (
    <>
      <AutoRefresh active={scripts.some((s) => s.busy)} />
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
        {STAGES.map((stage, i) => {
          const items = scripts.filter((s) => s.stage === stage);
          return (
            <Reveal key={stage} delay={0.04 * i} className="w-[78vw] max-w-sm shrink-0 snap-start lg:w-auto">
              <section className="flex h-full min-h-64 flex-col rounded-3xl glass p-3">
                <header className="mb-3 flex items-baseline justify-between px-1">
                  <div>
                    <h2 className="font-display text-xs font-semibold tracking-wide uppercase">{STAGE_LABEL[stage]}</h2>
                    <p className="text-[11px] text-muted">{STAGE_HINT[stage]}</p>
                  </div>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs tabular-nums">{items.length}</span>
                </header>
                <div className="flex flex-1 flex-col gap-2">
                  {items.length === 0 ? (
                    <p className="m-auto px-4 py-8 text-center text-xs text-white/30">{EMPTY[stage]}</p>
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
  script: "Нажми «Придумать 5 сценариев»",
  storyboard: "Одобри сценарий, и здесь появится сториборд",
  production: "Пока пусто",
  ready: "Пока пусто",
  published: "Пока пусто",
  rejected: "",
};

function Card({ s }: { s: Script }) {
  return (
    <Link
      href={`/studio/${s.id}`}
      className="group block rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 transition hover:-translate-y-0.5 hover:border-[#ff7a2f]/40 hover:bg-white/[0.05]"
    >
      {s.pillar && <span className="text-[10px] font-semibold tracking-wider text-[#ff7a2f] uppercase">{s.pillar}</span>}
      <h3 className="mt-0.5 text-sm leading-snug font-semibold">{s.title}</h3>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{s.payload.hook}</p>
      {s.busy && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-200">
          <span className="size-1.5 animate-ping rounded-full bg-[#ff7a2f]" /> Claude работает…
        </p>
      )}
      {s.error && !s.busy && <p className="mt-2 text-[11px] text-rose-300">⚠ {s.error}</p>}
    </Link>
  );
}
