import { savePersona } from "@/app/actions";
import { getRepo } from "@/lib/db";

const FIELDS = [
  { name: "facts", label: "Факты", hint: "Только правда о тебе. Чего здесь нет, сценарист заменит на «[реальный факт]»." },
  { name: "voice", label: "Голос", hint: "Как ты говоришь: слова, ритм, шутки, обращение к зрителю." },
  { name: "taboo", label: "Табу", hint: "Темы, слова и приёмы, которых у тебя быть не должно." },
] as const;

export default async function PersonaPage() {
  const p = await (await getRepo()).getPersona();
  return (
    <form action={savePersona} className="space-y-4">
      <h1 className="text-xl font-semibold">Persona</h1>
      <label className="block space-y-1">
        <span className="font-medium">Имя</span>
        <input name="name" defaultValue={p.name} className="w-full rounded-md border border-border bg-card px-3 py-2" />
      </label>
      {FIELDS.map((f) => (
        <label key={f.name} className="block space-y-1">
          <span className="font-medium">{f.label}</span>
          <span className="block text-sm text-muted">{f.hint}</span>
          <textarea name={f.name} defaultValue={p[f.name]} rows={8} className="w-full rounded-md border border-border bg-card px-3 py-2" />
        </label>
      ))}
      <button className="rounded-md bg-foreground px-4 py-2 text-background">Сохранить</button>
    </form>
  );
}
