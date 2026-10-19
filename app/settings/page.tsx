import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";

const ITEMS = [
  { href: "/persona", icon: "🧬", title: "Твой образ", text: "Факты о тебе, голос, табу и поисковые темы. Из этого собираются все сценарии." },
  { href: "/learning", icon: "🧠", title: "Обучение", text: "Правила, которые система выводит из твоих решений. Применяются только после твоего «ок»." },
  { href: "/runs", icon: "📜", title: "Логи прогонов", text: "Когда был запуск, что нашёл и где споткнулся." },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <Reveal>
        <h1 className="font-display text-2xl font-semibold">Настройки</h1>
        <p className="mt-1 text-sm text-muted">Заглядывать сюда нужно редко.</p>
      </Reveal>
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
