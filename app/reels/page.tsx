import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { StatusControls } from "@/components/status-controls";
import { Reveal } from "@/components/ui/reveal";
import { ScoreRing } from "@/components/ui/score-ring";
import { Segmented } from "@/components/ui/segmented";
import { getRepo } from "@/lib/db";
import { REEL_STATUSES, STATUS_LABEL, type ReelStatus } from "@/lib/db/types";
import { compact, dubaiDate } from "@/lib/format";

const LANE = {
  viral: { label: "🔥 Залёт", cls: "bg-orange-500/15 text-orange-300" },
  rising: { label: "📈 Растёт", cls: "bg-emerald-500/15 text-emerald-300" },
  queue: { label: "✋ Из очереди", cls: "bg-sky-500/15 text-sky-300" },
} as Record<string, { label: string; cls: string }>;

export default async function ReelsPage({ searchParams }: PageProps<"/reels">) {
  const raw = (await searchParams).status;
  const status = REEL_STATUSES.find((s) => s === raw) as ReelStatus | undefined;
  const all = await (await getRepo()).listReels();
  const reels = status ? all.filter((r) => r.status === status) : all;
  const count = (s?: ReelStatus) => (s ? all.filter((r) => r.status === s).length : all.length);

  return (
    <div className="space-y-6">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Залетевшие Reels</h1>
          <p className="mt-1 text-sm text-muted">Свежие залёты, разобранные и адаптированные под тебя</p>
        </div>
      </Reveal>

      <Segmented
        id="reels-status"
        items={[
          { href: "/reels", label: "Все", active: !status, count: count() },
          ...REEL_STATUSES.map((s) => ({ href: `/reels?status=${s}`, label: STATUS_LABEL[s], active: status === s, count: count(s) })),
        ]}
      />

      {reels.length === 0 && (
        <Reveal className="rounded-3xl border border-dashed border-white/10 p-12 text-center text-muted">Здесь пока пусто.</Reveal>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {reels.map((r, i) => (
          <Reveal key={r.id} delay={i * 0.06}>
            <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-transparent p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-400/25 hover:shadow-[0_20px_60px_-30px_rgba(245,181,68,0.45)]">
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={r.status} />
                    {r.lanes.map((l) => LANE[l] && (
                      <span key={l} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${LANE[l].cls}`}>{LANE[l].label}</span>
                    ))}
                  </div>
                  <Link href={`/reels/${r.id}`} className="block text-lg leading-snug font-semibold after:absolute after:inset-0 hover:text-amber-200">
                    {r.caption ?? r.url}
                  </Link>
                  <p className="text-xs text-muted">@{r.author} · {dubaiDate(r.postedAt)}</p>
                </div>
                {r.fitScore != null && <ScoreRing value={r.fitScore} />}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <Metric label="просмотры" value={compact(r.views)} highlight />
                <Metric label="лайки" value={compact(r.likes)} />
                <Metric label="комменты" value={compact(r.comments)} />
              </div>

              {r.fitReason && <p className="mt-4 text-sm leading-relaxed text-white/75">{r.fitReason}</p>}

              <div className="relative z-10 mt-auto pt-5">
                <StatusControls id={r.id} status={r.status} />
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/[0.05]">
      <div className={`text-lg font-semibold tabular-nums ${highlight ? "bg-gradient-to-r from-amber-200 to-orange-400 bg-clip-text text-transparent" : ""}`}>{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}
