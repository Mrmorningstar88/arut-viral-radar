import Link from "next/link";
import { connection } from "next/server";
import { PasswordForm, RequestPro, SignOut } from "@/components/account-actions";
import { MetricoolCard } from "@/components/metricool-card";
import { Reveal } from "@/components/ui/reveal";
import { isAdmin, requireUser } from "@/lib/auth/server";
import { isDemo } from "@/lib/db";
import { healthChecks } from "@/lib/health";
import { linkOf, listBrands, type Brand } from "@/lib/metricool";
import { PLANS, planOf, usage } from "@/lib/plans";
import { currentWorkspace, listProjects } from "@/lib/projects";

const ITEMS = [
  { href: "/persona", icon: "🧬", title: "Паспорт организации", text: "Факты, голос, табу и темы открытой организации. Из этого собираются все сценарии.", radar: false },
  { href: "/learning", icon: "🧠", title: "Обучение", text: "Правила, которые система выводит из твоих решений. Применяются только после твоего «ок».", radar: true },
  { href: "/runs", icon: "📜", title: "Логи поиска", text: "Когда искались залёты, что нашлось и где споткнулось.", radar: true },
];

export default async function SettingsPage() {
  await connection();
  if (isDemo()) return <p className="text-muted">В демо-режиме настройки недоступны.</p>;
  const user = await requireUser();
  const plan = planOf(user);
  const admin = isAdmin(user);
  const link = linkOf(user);
  const [used, checks, ws, projects, brands] = await Promise.all([
    usage(user.id),
    admin ? healthChecks() : null,
    currentWorkspace(),
    listProjects(),
    link ? listBrands(link).then((b): Brand[] | string => b).catch((e: Error) => e.message) : ([] as Brand[]),
  ]);
  const org = projects.find((p) => p.id === ws)?.name ?? "";
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
            {meter("Организации", used.projects, limits.projects)}
            {meter("Сценарии в этом месяце", used.scripts, limits.scripts)}
            {meter("Ролики в этом месяце", used.videos, limits.videos)}
          </div>
          {plan === "free" && (
            <div className="rounded-2xl bg-white/[0.04] p-4">
              <p className="text-sm font-medium">Pro: готовые ролики, 5 организаций, свежие залёты каждый день</p>
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
          <h2 className="mb-3 font-display text-sm font-semibold tracking-wide uppercase">Соцсети организации</h2>
          <MetricoolCard
            org={org}
            connected={!!link}
            brands={typeof brands === "string" ? [] : brands}
            chosen={link?.brands[ws] ?? null}
            error={typeof brands === "string" ? brands : null}
          />
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
