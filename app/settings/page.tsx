import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";
import { getRepo, isDemo } from "@/lib/db";
import { healthChecks } from "@/lib/health";

const ITEMS = [
  { href: "/persona", icon: "🧬", title: "Твой образ", text: "Факты о тебе, голос, табу и поисковые темы. Из этого собираются все сценарии." },
  { href: "/learning", icon: "🧠", title: "Обучение", text: "Правила, которые система выводит из твоих решений. Применяются только после твоего «ок»." },
  { href: "/runs", icon: "📜", title: "Логи прогонов", text: "Когда был запуск, что нашёл и где споткнулся." },
];

export default async function SettingsPage() {
  await getRepo(); // проверяет вход владельца
  const checks = isDemo() ? null : await healthChecks();
  return (
    <div className="space-y-6">
      <Reveal>
        <h1 className="font-display text-2xl font-semibold">Настройки</h1>
        <p className="mt-1 text-sm text-muted">Заглядывать сюда нужно редко.</p>
      </Reveal>
      {checks && (
        <Reveal delay={0.03} className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5">
          <h2 className="font-display text-sm font-semibold tracking-wide uppercase">Проверка подключений</h2>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {checks.map((c) => (
              <li key={c.name} className={`flex gap-3 rounded-2xl px-3 py-2.5 text-sm ${c.ok ? "bg-emerald-500/[0.07]" : "bg-rose-500/[0.08]"}`}>
                <span>{c.ok ? "✅" : "❌"}</span>
                <span>
                  <span className="font-medium">{c.name}</span>
                  {!c.ok && <span className="block text-xs text-rose-200/80">{c.hint}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {ITEMS.map((it, i) => (
          <Reveal key={it.href} delay={i * 0.05}>
            <Link href={it.href} className="block h-full rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5 transition-all hover:-translate-y-0.5 hover:border-amber-400/25">
              <span className="text-2xl">{it.icon}</span>
              <h2 className="mt-3 font-semibold">{it.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">{it.text}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
