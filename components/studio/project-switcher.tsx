import { switchProject } from "@/app/actions";
import { NewProjectInline } from "@/components/studio/new-project-inline";
import type { Project } from "@/lib/projects";

// Переключатель проектов: открытый подсвечен, остальные открываются одним нажатием.
export function ProjectSwitcher({ projects, active }: { projects: Project[]; active: string }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {projects.map((p) =>
        p.id === active ? (
          <span key={p.id} className="shrink-0 rounded-full bg-paper px-4 py-1.5 text-sm font-semibold text-ink">
            {p.name}
          </span>
        ) : (
          <form key={p.id} action={switchProject} className="shrink-0">
            <input type="hidden" name="id" value={p.id} />
            <button className="rounded-full glass-inset px-4 py-1.5 text-sm text-muted transition hover:text-foreground">{p.name}</button>
          </form>
        ),
      )}
      <NewProjectInline />
    </div>
  );
}
