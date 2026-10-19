import { setRuleStatus } from "@/app/actions";
import { getRepo } from "@/lib/db";

export default async function LearningPage() {
  const rules = await (await getRepo()).listRules();
  const proposed = rules.filter((r) => r.status === "proposed");
  const approved = rules.filter((r) => r.status === "approved");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Обучение</h1>
        <p className="text-sm text-muted">Раз в неделю система предлагает правила по твоим статусам и метрикам выложенных роликов. В генерацию попадают только одобренные.</p>
      </div>
      <section className="space-y-2">
        <h2 className="font-semibold">Ждут решения</h2>
        {proposed.length === 0 && <p className="text-sm text-muted">Новых правил нет.</p>}
        {proposed.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm">
            <span className="flex-1">{r.text}</span>
            <form action={setRuleStatus} className="flex gap-2">
              <input type="hidden" name="id" value={r.id} />
              <button name="status" value="approved" className="rounded-md bg-foreground px-3 py-1.5 text-background">Принять</button>
              <button name="status" value="rejected" className="rounded-md border border-border px-3 py-1.5">Отклонить</button>
            </form>
          </div>
        ))}
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">Работают сейчас</h2>
        {approved.length === 0 && <p className="text-sm text-muted">Пока ни одного.</p>}
        <ul className="list-disc space-y-1 pl-5 text-sm">{approved.map((r) => <li key={r.id}>{r.text}</li>)}</ul>
      </section>
    </div>
  );
}
