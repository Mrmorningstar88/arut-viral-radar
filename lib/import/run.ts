import "server-only";
import { serviceDb } from "@/lib/engine/store";
import { mergeText, RadarExport, toReelAnalysis, toReelRow, toRedpillStory } from "./radar";

export const IMPORT_MODEL = "radar-import";

export type ImportResult = { reels: number; redpill: number; creators: number; skipped: number };

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

// Повторный запуск ничего не дублирует: ролики сверяются по ссылке, сюжеты по названию,
// статусы и заметки, которые автор уже поставил, не трогаются.
export async function importRadar(ws: string, raw: unknown): Promise<ImportResult> {
  const data = RadarExport.parse(raw);
  const d = serviceDb();
  const out: ImportResult = { reels: 0, redpill: 0, creators: 0, skipped: 0 };

  const known = check(await d.from("reels").select("id, ext_id, analyses(id)").eq("workspace_id", ws).in("ext_id", data.reels.map((r) => r.id))) as {
    id: string; ext_id: string; analyses: { id: string }[] | null;
  }[];
  const analysed = new Set(known.filter((k) => (k.analyses ?? []).length > 0).map((k) => k.ext_id));
  for (const r of data.reels) {
    const row = check(await d.from("reels").upsert(toReelRow(ws, r), { onConflict: "workspace_id,platform,ext_id" }).select("id").single()) as { id: string };
    if (analysed.has(r.id)) {
      out.skipped++;
      continue;
    }
    check(await d.from("analyses").insert({ workspace_id: ws, reel_id: row.id, payload: toReelAnalysis(r), model: IMPORT_MODEL }));
    out.reels++;
  }

  const topics = new Set((check(await d.from("redpill").select("topic").eq("workspace_id", ws)) as { topic: string }[]).map((t) => t.topic));
  for (const p of data.redpill) {
    if (topics.has(p.title)) {
      out.skipped++;
      continue;
    }
    const story = toRedpillStory(p);
    const row = check(
      await d
        .from("redpill")
        .insert({
          workspace_id: ws, topic: p.title, era: story.era, distraction: story.distraction, facts: story.facts, sources: story.sources,
          ...(p.foundAt ? { created_at: p.foundAt } : {}),
        })
        .select("id")
        .single(),
    ) as { id: string };
    check(await d.from("analyses").insert({ workspace_id: ws, redpill_id: row.id, payload: story, model: IMPORT_MODEL }));
    out.redpill++;
  }

  const creators = [...new Set((data.config.creators?.list ?? []).map((c) => c.replace(/^@/, "").trim().toLowerCase()).filter(Boolean))];
  if (creators.length) {
    const have = new Set((check(await d.from("creators").select("username").eq("workspace_id", ws)) as { username: string }[]).map((c) => c.username.toLowerCase()));
    const fresh = creators.filter((c) => !have.has(c));
    if (fresh.length) check(await d.from("creators").insert(fresh.map((username) => ({ workspace_id: ws, username, source: "manual" }))));
    out.creators = fresh.length;
  }

  const p = data.config.persona;
  if (p) {
    const cur = (check(await d.from("persona").select("*").eq("workspace_id", ws).maybeSingle()) as Record<string, string> | null) ?? {};
    check(
      await d.from("persona").upsert({
        workspace_id: ws,
        name: cur.name || (p.facts?.split(/[,\n]/)[0].trim() ?? ""),
        facts: mergeText(cur.facts ?? "", p.facts),
        voice: mergeText(cur.voice ?? "", p.voice),
        taboo: mergeText(cur.taboo ?? "", p.taboo),
        updated_at: new Date().toISOString(),
      }),
    );
  }
  return out;
}
