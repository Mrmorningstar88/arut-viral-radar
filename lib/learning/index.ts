import "server-only";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { serviceDb } from "@/lib/engine/store";
import type { ReelAnalysis } from "@/lib/generate/schema";
import { costUsd, llm, MODEL_MAIN } from "@/lib/llm";

// Еженедельное обучение: из решений, правок и метрик автора собираем профиль вкуса и предлагаем правила.
// Правила попадают в генерацию только после одобрения автором.

const MIN_SIGNALS = 5;

const Lesson = z.object({
  taste: z.string().describe("Профиль вкуса автора: 4–8 коротких пунктов по-русски, что он берёт и что отвергает"),
  rules: z
    .array(z.object({ text: z.string().describe("Правило для сценариста, одно предложение по-русски"), evidence: z.array(z.string()).max(4) }))
    .max(5),
});

type Row = Record<string, unknown>;

const ru = (a: ReelAnalysis | null | undefined) => a?.i18n?.ru ?? a;

export type LearningSignals = { decisions: number; edits: number; published: number };

async function gather(ws: string) {
  const d = serviceDb();
  const [fb, reels, posts, rules] = await Promise.all([
    d.from("reel_feedback").select("reel_id, action, reason_code, reason_text, created_at").eq("workspace_id", ws).order("created_at", { ascending: false }).limit(80),
    d.from("reels").select("id, caption, author, views, fit_reason, analyses(payload, created_at)").eq("workspace_id", ws).order("created_at", { ascending: false }).limit(150),
    d.from("own_posts").select("url, reel_id, posted_at, own_post_metrics(day, views, likes, comments, saves, shares)").eq("workspace_id", ws).limit(60),
    d.from("learned_rules").select("text, status").eq("workspace_id", ws),
  ]);
  for (const r of [fb, reels, posts, rules]) if (r.error) throw new Error(r.error.message);

  const byId = new Map((reels.data as Row[]).map((r) => [r.id as string, r]));
  const versions = (r: Row) =>
    ((r.analyses as { payload: ReelAnalysis; created_at: string }[] | null) ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const hookOf = (r: Row | undefined) => {
    const v = r ? versions(r) : [];
    return ru(v[v.length - 1]?.payload)?.adaptation.hook ?? "";
  };

  const decisions = (fb.data as Row[]).map((f) => {
    const r = byId.get(f.reel_id as string);
    return `${f.action}${f.reason_text ? ` (${f.reason_text})` : ""}: «${String(r?.caption ?? "").slice(0, 140)}» @${r?.author ?? "?"} · хук адаптации: «${hookOf(r)}»`;
  });

  const edits = (reels.data as Row[])
    .map((r) => versions(r))
    .filter((v) => v.length > 1)
    .slice(0, 20)
    .map((v) => {
      const first = ru(v[0].payload)?.adaptation;
      const last = ru(v[v.length - 1].payload)?.adaptation;
      return `Было: «${first?.hook}» / ${first?.vo.map((x) => x.text).join(" ")}\nСтало: «${last?.hook}» / ${last?.vo.map((x) => x.text).join(" ")}`;
    });

  const published = (posts.data as Row[]).map((p) => {
    const m = ((p.own_post_metrics as Row[] | null) ?? []).sort((a, b) => (b.day as number) - (a.day as number))[0];
    return `${p.url} · хук: «${hookOf(byId.get(p.reel_id as string))}» · ${m ? `день ${m.day}: ${m.views ?? "?"} просмотров, ${m.likes ?? "?"} лайков, ${m.saves ?? "?"} сохранений, ${m.shares ?? "?"} репостов` : "метрик ещё нет"}`;
  });

  return { decisions, edits, published, rules: rules.data as { text: string; status: string }[] };
}

export async function learningSignals(ws: string): Promise<LearningSignals> {
  const g = await gather(ws);
  return { decisions: g.decisions.length, edits: g.edits.length, published: g.published.length };
}

export async function learn(ws: string): Promise<{ skipped?: string; proposed: number; usd: number }> {
  const g = await gather(ws);
  const total = g.decisions.length + g.edits.length + g.published.length;
  if (total < MIN_SIGNALS) return { skipped: `Мало данных: ${total} из ${MIN_SIGNALS} сигналов`, proposed: 0, usd: 0 };

  const known = g.rules.map((r) => `${r.status === "approved" ? "ПРИНЯТО" : r.status === "rejected" ? "ОТКЛОНЕНО" : "ЖДЁТ"}: ${r.text}`);
  const res = await llm().beta.messages.parse({
    model: MODEL_MAIN,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "high", format: betaZodOutputFormat(Lesson) },
    system:
      "Ты аналитик контента автора Reels. По его решениям, правкам сценариев и метрикам выложенных роликов найди устойчивые закономерности: какие хуки, темы, форматы, подача и локации он выбирает и что у него заходит. Правки весят больше всего: это его собственный голос. Правило формулируй как конкретную инструкцию сценаристу. Не повторяй уже принятые, отклонённые и ждущие правила. Если данных мало для вывода, верни меньше правил, а не выдуманные.",
    messages: [
      {
        role: "user",
        content: [
          `РЕШЕНИЯ (новые сверху):\n${g.decisions.join("\n") || "(нет)"}`,
          `ПРАВКИ СЦЕНАРИЕВ:\n${g.edits.join("\n\n") || "(нет)"}`,
          `ВЫЛОЖЕННЫЕ РОЛИКИ:\n${g.published.join("\n") || "(нет)"}`,
          `УЖЕ ЕСТЬ ПРАВИЛА:\n${known.join("\n") || "(нет)"}`,
        ].join("\n\n"),
      },
    ],
  });
  const usd = costUsd(MODEL_MAIN, res.usage);
  const out = res.parsed_output;
  if (!out) throw new Error(`empty output: ${res.stop_reason}`);

  const d = serviceDb();
  const t = await d.from("taste_profile").upsert({ workspace_id: ws, summary: out.taste, updated_at: new Date().toISOString() });
  if (t.error) throw new Error(t.error.message);
  const existing = new Set(g.rules.map((r) => r.text.trim().toLowerCase()));
  const fresh = out.rules.filter((r) => !existing.has(r.text.trim().toLowerCase()));
  if (fresh.length > 0) {
    const ins = await d.from("learned_rules").insert(fresh.map((r) => ({ workspace_id: ws, text: r.text, evidence: r.evidence })));
    if (ins.error) throw new Error(ins.error.message);
  }
  return { proposed: fresh.length, usd };
}

export async function learningOverview(ws: string) {
  const [signals, t] = await Promise.all([
    learningSignals(ws),
    serviceDb().from("taste_profile").select("summary, updated_at").eq("workspace_id", ws).maybeSingle(),
  ]);
  return { signals, taste: (t.data?.summary as string) ?? "", updatedAt: (t.data?.updated_at as string) ?? null };
}
