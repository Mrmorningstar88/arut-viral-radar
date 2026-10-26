import type { Run } from "@/lib/db/types";
import { dubaiDate } from "@/lib/format";

export function runSummary(r: Run) {
  const s = r.stats;
  const parts = [
    s.scanned != null && `проверил ${s.scanned} источников`,
    s.found != null && `нашёл ${s.found} залётов`,
    s.selected != null && `отобрал ${s.selected}`,
    s.excluded ? `отсеял фильтром ${s.excluded}` : null,
    s.queue ? `разобрал из ссылок ${s.queue}` : null,
    s.redpill ? "сюжет Red Pill готов" : null,
  ].filter(Boolean);
  return parts.join(", ") || "без результатов";
}

export function LastRun({ run }: { run: Run | undefined }) {
  if (!run) return <p className="text-sm text-muted">Прогонов ещё не было.</p>;
  const running = !run.finishedAt;
  return (
    <p className="flex items-baseline gap-2 text-sm text-muted">
      <span className={`size-2 shrink-0 translate-y-[-1px] rounded-full ${running ? "animate-pulse bg-amber-400" : run.errors.length ? "bg-rose-400" : "bg-emerald-400"}`} />
      {running ? `Идёт поиск, начал ${dubaiDate(run.startedAt)}. Обнови страницу через пару минут` : `Последний прогон ${dubaiDate(run.startedAt)}: ${runSummary(run)}`}
      {run.errors.length > 0 && <a href="/runs" className="text-rose-300 underline-offset-4 hover:underline">ошибки: {run.errors.length}</a>}
    </p>
  );
}
