import { PlanToggle } from "@/components/plan-toggle";
import { Reveal } from "@/components/ui/reveal";
import { isAdmin, requireAdmin } from "@/lib/auth/server";
import { serviceDb } from "@/lib/engine/store";
import { planOf } from "@/lib/plans";

// Клиенты сервиса: тариф, заявки на Pro, сколько сделано и сколько потрачено на каждого.

const monthStart = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
};

export default async function AdminPage() {
  await requireAdmin();
  const d = serviceDb();
  const since = monthStart();
  const [users, members, scripts, costs] = await Promise.all([
    d.auth.admin.listUsers({ perPage: 1000 }),
    d.from("workspace_members").select("workspace_id, user_id"),
    d.from("scripts").select("workspace_id, render_status").gte("created_at", since),
    d.from("usage_costs").select("workspace_id, usd").gte("created_at", since),
  ]);

  const wsOf = new Map<string, string[]>();
  for (const m of members.data ?? []) wsOf.set(m.user_id, [...(wsOf.get(m.user_id) ?? []), m.workspace_id]);
  const count = <T extends { workspace_id: string }>(rows: T[] | null, ids: string[], pick: (r: T) => number = () => 1) =>
    (rows ?? []).filter((r) => ids.includes(r.workspace_id)).reduce((s, r) => s + pick(r), 0);

  const rows = (users.data?.users ?? [])
    .map((u) => {
      const ids = wsOf.get(u.id) ?? [];
      return {
        id: u.id,
        email: u.email ?? "",
        created: u.created_at,
        plan: planOf(u),
        admin: isAdmin(u),
        request: (u.app_metadata?.pro_request as string | undefined) ?? null,
        projects: ids.length,
        scripts: count(scripts.data, ids),
        videos: count(scripts.data, ids, (r) => (r.render_status ? 1 : 0)),
        usd: count(costs.data, ids, (r) => Number(r.usd) || 0),
      };
    })
    .sort((a, b) => Number(!!b.request) - Number(!!a.request) || b.created.localeCompare(a.created));

  const total = rows.reduce((s, r) => s + r.usd, 0);
  const requests = rows.filter((r) => r.request && r.plan === "free").length;

  return (
    <div className="space-y-6">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Клиенты</h1>
          <p className="mt-1 text-sm text-muted">Цифры за текущий месяц. Тариф меняется одной кнопкой.</p>
        </div>
        <div className="flex gap-3 text-sm">
          <Stat label="Клиентов" value={String(rows.length)} />
          <Stat label="Заявок на Pro" value={String(requests)} accent={requests > 0} />
          <Stat label="Расход за месяц" value={`$${total.toFixed(2)}`} />
        </div>
      </Reveal>

      <Reveal delay={0.04} className="overflow-x-auto rounded-3xl glass">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-ink/[0.06]">
              <th className="px-4 py-3 font-medium">Почта</th>
              <th className="px-4 py-3 font-medium">С нами с</th>
              <th className="px-4 py-3 text-right font-medium">Организации</th>
              <th className="px-4 py-3 text-right font-medium">Сценарии</th>
              <th className="px-4 py-3 text-right font-medium">Ролики</th>
              <th className="px-4 py-3 text-right font-medium">Расход</th>
              <th className="px-4 py-3 font-medium">Тариф</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-ink/[0.04] last:border-0">
                <td className="px-4 py-3">
                  {r.email}
                  {r.request && r.plan === "free" && <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] text-accent">просит Pro</span>}
                </td>
                <td className="px-4 py-3 text-muted">{new Date(r.created).toLocaleDateString("ru-RU")}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.projects}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.scripts}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.videos}</td>
                <td className="px-4 py-3 text-right tabular-nums">${r.usd.toFixed(2)}</td>
                <td className="px-4 py-3">{r.admin ? <span className="text-muted">Владелец</span> : <PlanToggle userId={r.id} plan={r.plan === "pro" ? "pro" : "free"} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl px-4 py-2 ${accent ? "bg-accent/15 ring-1 ring-accent/30" : "glass"}`}>
      <p className="text-[11px] text-muted">{label}</p>
      <p className="font-display font-semibold tabular-nums">{value}</p>
    </div>
  );
}
