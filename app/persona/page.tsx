import { Button } from "@/components/ui/button";
import { savePersona } from "@/app/actions";
import { getRepo } from "@/lib/db";

const FIELDS = [
  { name: "topics", label: "О чём твой контент", hint: "Твои темы. Каждый чужой залёт я переношу на одну из них." },
  { name: "facts", label: "Факты", hint: "Только правда о тебе. Чего здесь нет, сценарист заменит на «[реальный факт]»." },
  { name: "voice", label: "Голос", hint: "Как ты говоришь: слова, ритм, шутки, обращение к зрителю." },
  { name: "taboo", label: "Табу", hint: "Темы, слова и приёмы, которых у тебя быть не должно." },
] as const;

export default async function PersonaPage() {
  const p = await (await getRepo()).getPersona();
  return (
    <form action={savePersona} className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Твой образ</h1>
      <label className="block space-y-1">
        <span className="font-medium">Имя</span>
        <input name="name" defaultValue={p.name} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none transition focus:border-amber-400/50" />
      </label>
      <label className="block space-y-1">
        <span className="font-medium">Темы для поиска</span>
        <span className="block text-sm text-muted">По одной на строку, до 10, например «трейдинг» или «инфляция». Радар ищет по ним залёты в Instagram сам, плюс по своим хэштегам про деньги и экономику.</span>
        <textarea name="queries" defaultValue={p.queries.join("\n")} rows={5} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none transition focus:border-amber-400/50" />
      </label>
      {FIELDS.map((f) => (
        <label key={f.name} className="block space-y-1">
          <span className="font-medium">{f.label}</span>
          <span className="block text-sm text-muted">{f.hint}</span>
          <textarea name={f.name} defaultValue={p[f.name]} rows={8} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none transition focus:border-amber-400/50" />
        </label>
      ))}
      <Button variant="primary">Сохранить</Button>
    </form>
  );
}
