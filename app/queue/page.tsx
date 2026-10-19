import { addToQueue } from "@/app/actions";
import { getRepo } from "@/lib/db";
import { dubaiDate } from "@/lib/format";

const LABEL = { pending: "В очереди", done: "Готово", error: "Ошибка" } as const;

export default async function QueuePage() {
  const items = await (await getRepo()).listQueue();
  return (
    <div className="space-y-6">
      <form action={addToQueue} className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h1 className="font-semibold">Разобрать ролик</h1>
        <p className="text-sm text-muted">Без порога просмотров. Заметка уйдёт в промпт как пожелание.</p>
        <input name="url" required type="url" placeholder="https://www.instagram.com/reel/…" className="w-full rounded-md border border-border bg-background px-3 py-2" />
        <textarea name="note" rows={2} placeholder="Что хочешь взять из ролика (необязательно)" className="w-full rounded-md border border-border bg-background px-3 py-2" />
        <button className="rounded-md bg-foreground px-4 py-2 text-background">Добавить</button>
      </form>

      <ul className="space-y-2">
        {items.length === 0 && <li className="text-muted">Очередь пуста.</li>}
        {items.map((q) => (
          <li key={q.id} className="rounded-lg border border-border bg-card p-3 text-sm">
            <div className="flex justify-between gap-2">
              <a href={q.url} target="_blank" rel="noreferrer" className="truncate underline">{q.url}</a>
              <span className="shrink-0 text-muted">{LABEL[q.status]} · {dubaiDate(q.createdAt)}</span>
            </div>
            {q.note && <p className="mt-1">{q.note}</p>}
            {q.errorRu && <p className="mt-1 text-red-600">{q.errorRu}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
