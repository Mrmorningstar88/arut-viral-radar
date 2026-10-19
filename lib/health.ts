import "server-only";
import { serviceDb } from "@/lib/engine/store";

export type Check = { name: string; ok: boolean; hint: string };

const has = (k: string) => Boolean(process.env[k]?.trim());

async function probe(fn: () => Promise<boolean>) {
  try {
    return await fn();
  } catch {
    return false;
  }
}

// Проверяет каждое подключение по-настоящему, но бесплатно: без генерации и без скрапинга.
export async function healthChecks(): Promise<Check[]> {
  const ws = process.env.WORKSPACE_ID;
  const [db, anthropic, apify] = await Promise.all([
    probe(async () => {
      if (!ws) return false;
      const { data, error } = await serviceDb().from("workspaces").select("id").eq("id", ws).maybeSingle();
      return !error && Boolean(data);
    }),
    probe(async () => {
      if (!has("ANTHROPIC_API_KEY")) return false;
      const r = await fetch("https://api.anthropic.com/v1/models?limit=1", {
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
      });
      return r.ok;
    }),
    probe(async () => {
      if (!has("APIFY_TOKEN")) return false;
      const r = await fetch("https://api.apify.com/v2/users/me", { headers: { Authorization: `Bearer ${process.env.APIFY_TOKEN}` } });
      return r.ok;
    }),
  ]);

  return [
    { name: "База Supabase", ok: db, hint: "Проверь в Vercel SUPABASE_SERVICE_ROLE_KEY и WORKSPACE_ID" },
    { name: "Вход по почте", ok: has("OWNER_EMAILS"), hint: "Добавь в Vercel OWNER_EMAILS" },
    { name: "Claude", ok: anthropic, hint: "Ключ ANTHROPIC_API_KEY не подошёл или на балансе ноль" },
    { name: "Apify (Instagram)", ok: apify, hint: "Токен APIFY_TOKEN не подошёл" },
    { name: "Расписание Inngest", ok: has("INNGEST_SIGNING_KEY") && has("INNGEST_EVENT_KEY"), hint: "Подключи интеграцию Inngest в Vercel и сделай Redeploy" },
    { name: "Поиск новых залётов (Exa)", ok: has("EXA_API_KEY"), hint: "Необязательно: без него радар следит только за авторами" },
  ];
}
