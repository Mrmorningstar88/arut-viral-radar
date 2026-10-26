import "server-only";
import { serviceDb } from "@/lib/engine/store";
import type { ScriptDraft, Stage, Storyboard } from "./schema";

export type Script = {
  id: string;
  stage: Stage;
  busy: boolean;
  error: string | null;
  title: string;
  pillar: string | null;
  sourceReelId: string | null;
  payload: ScriptDraft;
  storyboard: Storyboard | null;
  feedback: string | null;
  style: string | null;
  renderStatus: "queued" | "rendering" | "done" | "failed" | null;
  renderLog: string | null;
  videoUrl: string | null;
  publishedUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type Row = Record<string, unknown>;
const toScript = (r: Row): Script => ({
  id: r.id as string,
  stage: r.stage as Stage,
  busy: r.busy as boolean,
  error: (r.error as string) ?? null,
  title: r.title as string,
  pillar: (r.pillar as string) ?? null,
  sourceReelId: (r.source_reel_id as string) ?? null,
  payload: r.payload as ScriptDraft,
  storyboard: (r.storyboard as Storyboard) ?? null,
  feedback: (r.feedback as string) ?? null,
  style: (r.style as string) ?? null,
  renderStatus: (r.render_status as Script["renderStatus"]) ?? null,
  renderLog: (r.render_log as string) ?? null,
  videoUrl: (r.video_url as string) ?? null,
  publishedUrl: (r.published_url as string) ?? null,
  createdAt: r.created_at as string,
  updatedAt: r.updated_at as string,
});

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function listScripts(ws: string): Promise<Script[]> {
  const rows = check(await serviceDb().from("scripts").select("*").eq("workspace_id", ws).neq("stage", "rejected").order("created_at", { ascending: false }).limit(200));
  return (rows as Row[]).map(toScript);
}

export async function getScript(ws: string, id: string): Promise<Script | null> {
  const row = check(await serviceDb().from("scripts").select("*").eq("workspace_id", ws).eq("id", id).maybeSingle());
  return row ? toScript(row as Row) : null;
}

export async function insertScripts(ws: string, items: { draft: ScriptDraft; sourceReelId: string | null }[]) {
  if (items.length === 0) return;
  check(
    await serviceDb()
      .from("scripts")
      .insert(items.map(({ draft, sourceReelId }) => ({ workspace_id: ws, title: draft.title, pillar: draft.pillar, style: draft.style, source_reel_id: sourceReelId, payload: draft }))),
  );
}

export async function updateScript(ws: string, id: string, patch: Row) {
  check(await serviceDb().from("scripts").update({ ...patch, updated_at: new Date().toISOString() }).eq("workspace_id", ws).eq("id", id));
}

// Лучшие разобранные залёты проекта: из них берутся механики для новых сценариев.
// Механики берутся из залётов проекта; у нового проекта своих мало, и тогда добираются
// из общей базы формул (основной проект радара).
export async function topFormulas(ws: string, limit = 10) {
  const own = await formulasOf(ws, limit);
  const main = process.env.WORKSPACE_ID;
  if (own.length >= 5 || !main || main === ws) return own;
  return [...own, ...(await formulasOf(main, limit))].slice(0, limit);
}

async function formulasOf(ws: string, limit: number) {
  const rows = check(
    await serviceDb()
      .from("reels")
      .select("id, author, views, caption, status, analyses(payload, created_at)")
      .eq("workspace_id", ws)
      .neq("status", "rejected")
      .order("views", { ascending: false, nullsFirst: false })
      .limit(40),
  ) as Row[];
  return rows
    .map((r) => {
      const a = ((r.analyses as { payload: Record<string, unknown>; created_at: string }[] | null) ?? []).sort((x, y) => y.created_at.localeCompare(x.created_at))[0]?.payload;
      const ru = ((a?.i18n as Record<string, unknown> | undefined)?.ru ?? a) as
        | { original?: { summary: string; mechanic: { element: string; theirs: string }[] }; why?: string[] }
        | undefined;
      if (!ru?.original) return null;
      return {
        id: r.id as string,
        line: [
          `@${r.author} · ${r.views ?? "?"} просмотров`,
          `Что в ролике: ${ru.original.summary}`,
          `Механика: ${ru.original.mechanic.map((m) => `${m.element}: ${m.theirs}`).join("; ")}`,
          ru.why && `Почему залетел: ${ru.why.join("; ")}`,
        ]
          .filter(Boolean)
          .join("\n"),
      };
    })
    .filter((x): x is { id: string; line: string } => x !== null)
    .slice(0, limit);
}
