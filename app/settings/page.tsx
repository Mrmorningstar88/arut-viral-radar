import Link from "next/link";
import { connection } from "next/server";
import { PasswordForm, RequestPro, SignOut } from "@/components/account-actions";
import { Reveal } from "@/components/ui/reveal";
import { isAdmin, requireUser } from "@/lib/auth/server";
import { isDemo } from "@/lib/db";
import { healthChecks } from "@/lib/health";
import { PLANS, planOf, usage } from "@/lib/plans";

const ITEMS = [
  { href: "/persona", icon: "🧬", title: "Образ проекта", text: "Факты, голос, табу и темы открытого проекта. Из этого собираются все сценарии.", radar: false },
  { href: "/learning", icon: "🧠", title: "Обучение", text: "Правила, которые система выводит из твоих решений. Применяются только после твоего «ок».", radar: true },
  { href: "/runs", icon: "📜", title: "Логи поиска", text: "Когда искались залёты, что нашлось и где споткнулось.", radar: true },
];

const CHANNELS = [
  { name: "Instagram", text: "Готовые ролики будут публиковаться в твой аккаунт автоматически" },
  { name: "TikTok", text: "То же самое для TikTok" },
];

export default async function SettingsPage() {
  await connection();
  if (isDemo()) return <p className="text-muted">В демо-режиме настройки недоступны.</p>;
  const user = await requireUser();
  const plan = planOf(user);
  const admin = isAdmin(user);
  const [used, checks] = await Promise.all([usage(user.id), admin ? healthChecks() : null]);
  const limits = PLANS[plan].limits;
  const meter = (label: string, n: number, max: number) => (
    <div key={label}>
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums">{Number.isFinite(max) ? `${n} из ${max}` : n}</span>
      </div>
      {Number.isFinite(max) && max > 0 && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-[#ff7a2f]" style={{ width: `${Math.min(100, (n / max) * 100)}%` }} />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <Reveal>
        <h1 className="font-display text-2xl font-semibold">Настройки</h1>
      </Reveal>

      <div className="grid gap-4 md:grid-cols-2">
        <Reveal delay={0.03} className="space-y-5 rounded-3xl glass p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-semibold tracking-wide uppercase">Аккаунт</h2>
              <p className="mt-1 text-sm text-muted">{user.email}</p>
            </div>
            <span className="rounded-full bg-[#ff7a2f]/15 px-3 py-1 text-xs font-semibold text-[#ff7a2f]">{PLANS[plan].name}</span>
          </div>
          <div className="space-y-3">
            {meter("Проекты", used.projects, limits.projects)}
            {meter("Сценарии в этом месяце", used.scripts, limits.scripts)}
            {meter("Ролики в этом месяце", used.videos, limits.videos)}
          </div>
          {plan === "free" && (
            <div className="rounded-2xl bg-white/[0.04] p-4">
              <p className="text-sm font-medium">Pro: готовые ролики, 5 проектов, свежие залёты каждый день</p>
              <div className="mt-3">
                <RequestPro requested={!!user.app_metadata?.pro_request} />
              </div>
            </div>
          )}
          <div>
            <p className="mb-2 text-xs text-muted">Пароль для входа</p>
            <PasswordForm />
          </div>
          <SignOut />
        </Reveal>

        <Reveal delay={0.06} className="rounded-3xl glass p-5">
          <h2 className="font-display text-sm font-semibold tracking-wide uppercase">Публикация</h2>
          <ul className="mt-4 space-y-2">
            {CHANNELS.map((c) => (
              <li key={c.name} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted">{c.text}</p>
                </div>
                <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-muted">Скоро</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Пока готовый ролик можно скачать в карточке и выложить вручную.</p>
        </Reveal>
      </div>

      {checks && (
        <Reveal delay={0.08} className="rounded-3xl glass p-5">
          <h2 className="font-display text-sm font-semibold tracking-wide uppercase">Проверка подключений (видишь только ты)</h2>
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
        {ITEMS.filter((it) => !it.radar || plan !== "free").map((it, i) => (
          <Reveal key={it.href} delay={0.1 + i * 0.05}>
            <Link href={it.href} className="block h-full rounded-3xl glass p-5 transition-all hover:-translate-y-0.5 hover:border-amber-400/25">
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
