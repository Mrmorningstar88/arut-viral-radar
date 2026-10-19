import { getRepo } from "@/lib/db";
import { dubaiDate } from "@/lib/format";

const KIND = { morning: "Утро 09:00", evening: "Вечер 20:00", manual: "Вручную" } as const;

export default async function RunsPage() {
  const runs = await (await getRepo()).listRuns();
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Логи запусков</h1>
      <ul className="space-y-2">
        {runs.map((r) => (
          <li key={r.id} className="rounded-lg border border-border bg-card p-3 text-sm">
            <div className="flex justify-between"><span className="font-medium">{KIND[r.kind]}</span><span className="text-muted">{dubaiDate(r.startedAt)}</span></div>
            <p className="mt-1 text-muted">{Object.entries(r.stats).map(([k, v]) => `${k}: ${v}`).join(" · ") || "Без статистики"}</p>
            {r.errors.map((e, i) => <p key={i} className="mt-1 text-red-600">{e}</p>)}
          </li>
        ))}
      </ul>
    </div>
  );
}
