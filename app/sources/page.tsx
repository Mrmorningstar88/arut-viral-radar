import { AddCreatorForm, AddReelForm } from "@/components/add-forms";
import { Panel } from "@/components/ui/panel";
import { Reveal } from "@/components/ui/reveal";
import { getRepo } from "@/lib/db";
import { compact, dubaiDate } from "@/lib/format";

const QUEUE_LABEL = { pending: "⏳ Разбираю", done: "✅ Готово", error: "⚠️ Ошибка" } as const;

// Разбор ссылки идёт в фоне после ответа и может занять пару минут.
export const maxDuration = 300;

export default async function SourcesPage() {
  const repo = await getRepo();
  const [queue, creators] = await Promise.all([repo.listQueue(), repo.listCreators()]);

  return (
    <div className="space-y-6">
      <Reveal>
        <h1 className="font-display text-2xl font-semibold">Добавить</h1>
        <p className="mt-1 text-sm text-muted">Два способа дать радару пищу: конкретный ролик или автор, за которым следить.</p>
      </Reveal>

      <Reveal delay={0.05} className="grid gap-4 md:grid-cols-2">
        <Panel title="Ролик, который понравился" subtitle="Разберу и адаптирую под тебя сразу, без порога просмотров">
          <AddReelForm />
          {queue.length > 0 && (
            <ul className="mt-5 space-y-2 text-sm">
              {queue.slice(0, 8).map((q) => (
                <li key={q.id} className="rounded-2xl bg-ink/[0.03] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <a href={q.url} target="_blank" rel="noreferrer" className="truncate text-ink/80 hover:text-foreground">{q.url.replace(/^https:\/\/(www\.)?/, "")}</a>
                    <span className="shrink-0 text-xs text-muted">{QUEUE_LABEL[q.status]}</span>
                  </div>
                  {q.errorRu && <p className="mt-1 text-xs text-rose-300">{q.errorRu}</p>}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Авторы, за которыми следить" subtitle="Каждый прогон проверяю их новые ролики. Авторы с залётом от 10M добавляются сами">
          <AddCreatorForm />
          <ul className="mt-5 space-y-2 text-sm">
            {creators.length === 0 && <li className="text-muted">Пока никого. Добавь 3–5 авторов, чей формат тебе близок.</li>}
            {creators.map((c) => (
              <li key={c.username} className="flex items-center justify-between gap-2 rounded-2xl bg-ink/[0.03] px-3 py-2">
                <a href={`https://www.instagram.com/${c.username}/`} target="_blank" rel="noreferrer" className="font-medium hover:text-amber-200">@{c.username}</a>
                <span className="text-xs text-muted">
                  {c.followers != null ? `${compact(c.followers)} подписчиков · ` : ""}
                  {c.lastCheckedAt ? `проверен ${dubaiDate(c.lastCheckedAt)}` : "ещё не проверен"}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </Reveal>
    </div>
  );
}
