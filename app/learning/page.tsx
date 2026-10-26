import { LearnNowButton } from "@/components/learn-now";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { setRuleStatus } from "@/app/actions";
import { getRepo, isDemo } from "@/lib/db";
import { dubaiDate } from "@/lib/format";
import { learningOverview } from "@/lib/learning";
import { currentWorkspace } from "@/lib/projects";

const GOALS = [
  { key: "decisions", label: "решений «в работу / не подходит»", goal: 20 },
  { key: "edits", label: "твоих правок сценариев", goal: 10 },
  { key: "published", label: "выложенных роликов с метриками", goal: 25 },
] as const;

// Пересборка через Claude идёт прямо в запросе и может занять до пары минут.
export const maxDuration = 300;

export default async function LearningPage() {
  const rules = await (await getRepo()).listRules();
  const overview = isDemo()
    ? { signals: { decisions: 3, edits: 1, published: 0 }, taste: "Демо: берёшь хуки-вопросы про деньги, отвергаешь туристические темы.", updatedAt: null }
    : await learningOverview(await currentWorkspace());
  const proposed = rules.filter((r) => r.status === "proposed");
  const approved = rules.filter((r) => r.status === "approved");

  return (
    <div className="space-y-6">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Обучение</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">Каждое воскресенье в 10:00 я разбираю твои решения, правки и метрики, обновляю профиль вкуса и предлагаю правила. В сценарии попадают только те, что ты принял.</p>
        </div>
        <LearnNowButton />
      </Reveal>

      <Reveal delay={0.04} className="grid gap-3 md:grid-cols-3">
        {GOALS.map((g) => {
          const n = overview.signals[g.key];
          return (
            <div key={g.key} className="rounded-3xl glass p-4">
              <p className="font-display text-2xl font-semibold">{n}<span className="text-base text-muted"> / {g.goal}</span></p>
              <p className="text-sm text-muted">{g.label}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-white/80" style={{ width: `${Math.min(100, (n / g.goal) * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </Reveal>

      <Reveal delay={0.08} className="rounded-3xl glass p-5">
        <h2 className="font-display text-sm font-semibold tracking-wide uppercase">Твой вкус, как я его понимаю</h2>
        {overview.updatedAt && <p className="mt-1 text-xs text-muted">Обновлено {dubaiDate(overview.updatedAt)}</p>}
        <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">{overview.taste || "Пока не сформирован: нужно хотя бы 5 решений или правок."}</p>
      </Reveal>

      <Reveal delay={0.12} className="space-y-2">
        <h2 className="font-semibold">Ждут твоего решения</h2>
        {proposed.length === 0 && <p className="text-sm text-muted">Новых правил нет.</p>}
        {proposed.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 glass rounded-3xl p-4 text-sm">
            <span className="flex-1 leading-relaxed">{r.text}</span>
            <form action={setRuleStatus} className="flex gap-2">
              <input type="hidden" name="id" value={r.id} />
              <Button name="status" value="approved" variant="primary">Принять</Button>
              <Button name="status" value="rejected">Отклонить</Button>
            </form>
          </div>
        ))}
      </Reveal>

      <Reveal delay={0.16} className="space-y-2">
        <h2 className="font-semibold">Работают сейчас</h2>
        {approved.length === 0 && <p className="text-sm text-muted">Пока ни одного.</p>}
        <ul className="space-y-2 text-sm">
          {approved.map((r) => <li key={r.id} className="rounded-2xl bg-emerald-500/[0.06] px-4 py-2.5">✓ {r.text}</li>)}
        </ul>
      </Reveal>
    </div>
  );
}
