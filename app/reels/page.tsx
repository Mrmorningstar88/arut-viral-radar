import Link from "next/link";
import { AddReelForm } from "@/components/add-forms";
import { LastRun } from "@/components/last-run";
import { StatusBadge } from "@/components/status-badge";
import { RunNowButton } from "@/components/run-now";
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
  const repo = await getRepo();
  const [all, runs, creators] = await Promise.all([repo.listReels(), repo.listRuns(), repo.listCreators()]);
  const reels = status ? all.filter((r) => r.status === status) : all;
  const count = (s?: ReelStatus) => (s ? all.filter((r) => r.status === s).length : all.length);

  return (
    <div className="space-y-6">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Ролики для тебя</h1>
          <p className="mt-1 mb-2 text-sm text-muted">Залетевшие Reels со сценарием под тебя. Сам ищу в 09:00 и 20:00 по Дубаю</p>
          <LastRun run={runs[0]} />
        </div>
        <RunNowButton />
      </Reveal>

      {all.length === 0 ? (
        <GettingStarted hasCreators={creators.length > 0} />
      ) : (
      <Segmented
        id="reels-status"
        items={[
          { href: "/reels", label: "Все", active: !status, count: count() },
          ...REEL_STATUSES.map((s) => ({ href: `/reels?status=${s}`, label: STATUS_LABEL[s], active: status === s, count: count(s) })),
        ]}
      />

      )}

      {all.length > 0 && reels.length === 0 && (
        <Reveal className="rounded-3xl border border-dashed border-white/10 p-12 text-center text-muted">В этом статусе пока ничего.</Reveal>
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

function GettingStarted({ hasCreators }: { hasCreators: boolean }) {
  return (
    <Reveal delay={0.05} className="grid gap-4 md:grid-cols-2">
      <section className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-400/[0.08] to-transparent p-6">
        <p className="text-xs font-semibold tracking-widest text-amber-300 uppercase">Быстрый тест</p>
        <h2 className="mt-2 font-display text-lg font-semibold">Вставь ссылку на любой Reels</h2>
        <p className="mt-1 mb-4 text-sm text-muted">Через пару минут здесь появится разбор: почему залетело, сценарий под тебя и 3D-раскадровка.</p>
        <AddReelForm compact />
      </section>
      <section className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6">
        <p className="text-xs font-semibold tracking-widest text-muted uppercase">Чтобы радар искал сам</p>
        <ol className="mt-3 space-y-3 text-sm">
          <Step n={1} done={hasCreators}>
            <Link href="/sources" className="font-medium text-amber-200 hover:underline">Добавь 3–5 авторов</Link>, чей формат тебе близок
          </Step>
          <Step n={2}>Нажми «Запустить сейчас» или жди 09:00 и 20:00</Step>
          <Step n={3}>Отмечай ролики «В работе» или «Не подходит», так я учусь твоему вкусу</Step>
        </ol>
      </section>
    </Reveal>
  );
}

function Step({ n, done, children }: { n: number; done?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${done ? "bg-emerald-400/20 text-emerald-300" : "bg-white/[0.06] text-muted"}`}>{done ? "✓" : n}</span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}
