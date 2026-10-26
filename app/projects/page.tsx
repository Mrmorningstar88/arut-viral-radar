import { switchProject } from "@/app/actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { getRepo, isDemo } from "@/lib/db";
import { currentWorkspace, listProjects, type Project } from "@/lib/projects";

export default async function ProjectsPage() {
  await getRepo(); // проверяет вход владельца
  if (isDemo()) return <p className="text-muted">Организации появятся, когда подключена база.</p>;
  const [projects, active] = await Promise.all([listProjects(), currentWorkspace()]);
  const current = projects.find((p) => p.id === active);

  return (
    <div className="space-y-6">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold">Организации</h1>
            <p className="mt-1 text-sm text-muted">У каждой организации свой паспорт, свои сценарии, ролики и соцсети.</p>
          </div>
          <Link href="/welcome" className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white">
            + Новая организация
          </Link>
        </div>
      </Reveal>

      <div className="grid gap-4 md:grid-cols-3">
        {projects.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.04}>
            <div className={`flex h-full flex-col rounded-3xl glass p-5 ${p.id === active ? "ring-1 ring-accent/60" : ""}`}>
              <h2 className="font-semibold">{p.name}</h2>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-muted">{p.passport?.oneLiner ?? (p.productUrl ? p.productUrl : "Личный блог")}</p>
              {p.id === active ? (
                <span className="mt-4 text-xs font-medium text-accent">Открыта сейчас</span>
              ) : (
                <form action={switchProject} className="mt-4">
                  <input type="hidden" name="id" value={p.id} />
                  <Button type="submit">Открыть</Button>
                </form>
              )}
            </div>
          </Reveal>
        ))}
      </div>

      {current?.passport && <PassportView project={current} />}
    </div>
  );
}

function PassportView({ project }: { project: Project }) {
  const p = project.passport!;
  const blocks = [
    { title: "Аудитория", items: p.audience },
    { title: "Боли", items: p.pains },
    { title: "Выгоды", items: p.benefits },
    { title: "Факты и кейсы", items: p.proof },
    { title: "Нельзя", items: p.taboo },
  ].filter((b) => b.items.length > 0);
  return (
    <Reveal delay={0.08} className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">Паспорт организации: {p.name}</h2>
        <p className="mt-1 text-sm text-muted">{p.oneLiner}</p>
        {project.productUrl && (
          <a href={project.productUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-accent hover:underline">
            {project.productUrl}
          </a>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {p.pillars.map((x) => (
          <div key={x.title} className="rounded-3xl glass p-5">
            <span className="text-xs uppercase tracking-wide text-muted">Рубрика</span>
            <h3 className="mt-1 font-semibold">{x.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{x.why}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {blocks.map((b) => (
          <div key={b.title} className="rounded-3xl glass p-5">
            <h3 className="font-display text-sm font-semibold tracking-wide uppercase">{b.title}</h3>
            <ul className="mt-3 space-y-1.5 text-sm leading-relaxed">
              {b.items.map((x) => (
                <li key={x}>• {x}</li>
              ))}
            </ul>
          </div>
        ))}
        <div className="rounded-3xl glass p-5">
          <h3 className="font-display text-sm font-semibold tracking-wide uppercase">Голос и поиск</h3>
          <p className="mt-3 text-sm leading-relaxed">{p.tone}</p>
          <p className="mt-3 text-xs text-muted">Хэштеги для поиска залётов: {p.searchQueries.join(", ")}</p>
        </div>
      </div>
      <p className="text-xs text-muted">Поправить тексты можно в ⚙ Настройки → Паспорт организации.</p>
    </Reveal>
  );
}
