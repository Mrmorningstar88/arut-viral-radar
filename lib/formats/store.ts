import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { logCost, serviceDb } from "@/lib/engine/store";
import { costUsd, llm, MODEL_FAST } from "@/lib/llm";
import { FORMAT_IDS, FORMATS, rankFormats, type FormatId, type FormatRank } from "./catalog";

// Формат ролика определяет Haiku по подписи и разбору. Ролик публичный, его формат одинаков для всех,
// поэтому метка живёт в общем кэше source_cache по ключу ролика: новых таблиц не нужно.

const KEY = (extId: string) => `fmt:instagram:${extId}`;
const FOREVER = "2100-01-01T00:00:00Z";
const BATCH = 20;

type Tag = { format: FormatId; confidence: number };
type Row = Record<string, unknown>;

export type FormatReel = {
  id: string;
  author: string;
  views: number | null;
  likes: number | null;
  coverUrl: string | null;
  hook: string;
  format: FormatId | null;
  confidence: number;
};

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

async function tagsOf(extIds: string[]): Promise<Map<string, Tag>> {
  const out = new Map<string, Tag>();
  for (let i = 0; i < extIds.length; i += 200) {
    const keys = extIds.slice(i, i + 200).map(KEY);
    const rows = check(await serviceDb().from("source_cache").select("key, payload").in("key", keys)) as Row[];
    for (const r of rows) out.set((r.key as string).slice(KEY("").length), r.payload as Tag);
  }
  return out;
}

// Ролики пространства с разбором и меткой формата, самые просматриваемые первыми.
async function reelsOf(ws: string): Promise<(FormatReel & { extId: string; caption: string; mechanic: string })[]> {
  const rows = check(
    await serviceDb()
      .from("reels")
      .select("id, ext_id, author, views, likes, cover_url, caption, analyses(payload, created_at)")
      .eq("workspace_id", ws)
      .neq("status", "rejected")
      .order("views", { ascending: false, nullsFirst: false })
      .limit(300),
  ) as Row[];
  const tags = await tagsOf(rows.map((r) => r.ext_id as string));
  return rows.map((r) => {
    const a = ((r.analyses as { payload: Record<string, unknown>; created_at: string }[] | null) ?? []).sort((x, y) => y.created_at.localeCompare(x.created_at))[0]?.payload;
    const ru = ((a?.i18n as Record<string, unknown> | undefined)?.ru ?? a) as
      | { original?: { summary: string; mechanic: { element: string; theirs: string }[] }; adaptation?: { hook?: string } }
      | undefined;
    const tag = tags.get(r.ext_id as string);
    return {
      id: r.id as string,
      extId: r.ext_id as string,
      author: (r.author as string) ?? "",
      views: (r.views as number) ?? null,
      likes: (r.likes as number) ?? null,
      coverUrl: (r.cover_url as string) ?? null,
      caption: ((r.caption as string) ?? "").slice(0, 500),
      hook: ru?.original?.summary ?? ((r.caption as string) ?? "").slice(0, 140),
      mechanic: ru?.original?.mechanic.map((m) => `${m.element}: ${m.theirs}`).join("; ") ?? "",
      format: tag?.format ?? null,
      confidence: tag?.confidence ?? 0,
    };
  });
}

const Labels = z.object({
  items: z.array(z.object({ n: z.number().int(), format: z.enum(FORMAT_IDS), confidence: z.number().min(0).max(1) })),
});

const SYSTEM = `Ты раскладываешь короткие вертикальные ролики (Reels, TikTok) по форматам. Формат это способ подачи, а не тема.
Форматы:
${FORMATS.map((f) => `- ${f.id}: ${f.label}. ${f.hint}`).join("\n")}
Для каждого ролика верни один формат и уверенность 0–1. Если описания мало, ставь уверенность ниже 0,5.`;

// Размечает ролики без формата. Возвращает, сколько разметил.
export async function classifyMissing(ws: string, limit = 60): Promise<number> {
  const todo = (await reelsOf(ws)).filter((r) => !r.format).slice(0, limit);
  let done = 0;
  let usd = 0;
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const res = await llm().beta.messages.parse({
      model: MODEL_FAST,
      max_tokens: 2048,
      output_config: { effort: "low", format: betaZodOutputFormat(Labels) },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: batch.map((r, j) => `${j + 1}. @${r.author}\nПодпись: ${r.caption || "(нет)"}\nЧто в ролике: ${r.hook}\nМеханика: ${r.mechanic || "(нет разбора)"}`).join("\n\n"),
        },
      ],
    });
    usd += costUsd(MODEL_FAST, res.usage);
    const rows = (res.parsed_output?.items ?? [])
      .filter((x) => batch[x.n - 1])
      .map((x) => ({ key: KEY(batch[x.n - 1].extId), payload: { format: x.format, confidence: x.confidence } satisfies Tag, expires_at: FOREVER }));
    if (rows.length) check(await serviceDb().from("source_cache").upsert(rows));
    done += rows.length;
  }
  if (usd > 0) await logCost(ws, null, "anthropic", usd, done);
  return done;
}

export type FormatBoard = {
  shared: boolean; // своих залётов мало, показана общая база формул
  reels: FormatReel[];
  unlabeled: number;
  overallMedian: number;
  ranks: FormatRank[];
};

// Своих залётов меньше пяти: показываем общую базу формул основного пространства.
export async function formatBoard(ws: string): Promise<FormatBoard> {
  let reels = await reelsOf(ws);
  const main = process.env.WORKSPACE_ID;
  const shared = reels.length < 5 && !!main && main !== ws;
  if (shared) reels = await reelsOf(main);
  const labeled = reels.filter((r): r is typeof r & { format: FormatId } => r.format !== null);
  const { overallMedian, ranks } = rankFormats(labeled);
  return {
    shared,
    reels: reels.map(({ id, author, views, likes, coverUrl, hook, format, confidence }) => ({ id, author, views, likes, coverUrl, hook, format, confidence })),
    unlabeled: reels.length - labeled.length,
    overallMedian,
    ranks,
  };
}

// Отрыв формата для каждого ролика: генератор сценариев берёт механики сильных форматов первыми.
export async function formatStrength(reelIds: string[], ws: string): Promise<Map<string, { format: FormatId; multiple: number; enough: boolean }>> {
  const board = await formatBoard(ws);
  const byFormat = new Map(board.ranks.map((r) => [r.id, r]));
  const out = new Map<string, { format: FormatId; multiple: number; enough: boolean }>();
  for (const r of board.reels) {
    if (!reelIds.includes(r.id) || !r.format) continue;
    const rank = byFormat.get(r.format);
    if (rank) out.set(r.id, { format: r.format, multiple: rank.multiple, enough: rank.enough });
  }
  return out;
}
