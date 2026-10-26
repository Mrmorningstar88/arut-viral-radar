"use client";

import { useActionState, useTransition } from "react";
import { chooseBrand, connectMetricool, disconnectMetricool } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type Brand = { blogId: string; label: string; networks: string[] };
const LABEL: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", facebook: "Facebook" };
const INPUT = "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#ff7a2f]/60";

// Соцсети организации через Metricool: один раз токен аккаунта, потом бренд Metricool для каждой организации.
export function MetricoolCard({ org, connected, brands, chosen, error }: { org: string; connected: boolean; brands: Brand[]; chosen: string | null; error: string | null }) {
  const [state, action, pending] = useActionState(connectMetricool, null);
  const [busy, start] = useTransition();
  const toast = useToast();

  if (!connected)
    return (
      <form action={action} className="space-y-3">
        <p className="text-sm text-muted">
          Ролики выходят в Instagram и TikTok через Metricool. Подключи соцсети в Metricool, затем вставь сюда токен из Metricool → Настройки аккаунта → API (нужен тариф Advanced) и свой userId (число после <code>userId=</code> в адресе Metricool).
        </p>
        <input name="token" required placeholder="Токен API Metricool" autoComplete="off" className={INPUT} />
        <input name="userId" required inputMode="numeric" placeholder="userId" className={INPUT} />
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Проверяю…" : "Подключить Metricool"}
        </Button>
        {state && <p className={`text-xs ${state.error ? "text-rose-300" : "text-emerald-300"}`}>{state.error ?? state.message}</p>}
      </form>
    );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Бренд Metricool для организации <b className="text-foreground">{org}</b>:
      </p>
      {error && <p className="text-xs text-rose-300">{error}</p>}
      <ul className="space-y-2">
        {brands.map((b) => {
          const on = b.blogId === chosen;
          return (
            <li key={b.blogId}>
              <button
                disabled={busy || on}
                onClick={() =>
                  start(async () => {
                    const r = await chooseBrand(b.blogId);
                    toast(r.error ?? `Организация публикуется через «${b.label}»`, r.error ? "error" : undefined);
                  })
                }
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${on ? "bg-[#ff7a2f]/15 ring-1 ring-[#ff7a2f]/40" : "bg-white/[0.04] hover:bg-white/[0.07]"}`}
              >
                <span className="flex-1">
                  <span className="block text-sm font-medium">{b.label}</span>
                  <span className="text-xs text-muted">{b.networks.length > 0 ? b.networks.map((n) => LABEL[n]).join(" · ") : "соцсети не подключены"}</span>
                </span>
                {on && <span className="text-xs text-[#ff7a2f]">✓ выбран</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <button onClick={() => start(async () => void (await disconnectMetricool()))} className="text-xs text-muted hover:text-rose-300">
        Отключить Metricool
      </button>
    </div>
  );
}
