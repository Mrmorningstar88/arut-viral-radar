import Link from "next/link";
import { AddReelForm, RetryQueueButton } from "@/components/add-forms";
import { LastRun } from "@/components/last-run";
import { ReelCatalog } from "@/components/reel-catalog";
import { RunNowButton } from "@/components/run-now";
import { Reveal } from "@/components/ui/reveal";
import { Segmented } from "@/components/ui/segmented";
import { getRepo } from "@/lib/db";
import { REEL_STATUSES, STATUS_LABEL, type ReelStatus } from "@/lib/db/types";

// Разбор ссылки идёт в фоне после ответа и может занять пару минут.
export const maxDuration = 300;

export default async function ReelsPage({ searchParams }: PageProps<"/reels">) {
  const raw = (await searchParams).status;
  const status = REEL_STATUSES.find((s) => s === raw) as ReelStatus | undefined;
  const repo = await getRepo();
  const [all, runs, creators, queue] = await Promise.all([repo.listReels(), repo.listRuns(), repo.listCreators(), repo.listQueue()]);
  const open = queue.filter((q) => q.status !== "done").slice(0, 5);
  const running = runs[0] && !runs[0].finishedAt;
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

      {open.length > 0 && (
        <Reveal className="space-y-2 rounded-3xl glass p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Твои ссылки</p>
            {!running && open.some((q) => q.status === "pending") && <RetryQueueButton />}
          </div>
          <ul className="space-y-1.5 text-sm">
            {open.map((q) => (
              <li key={q.id} className="rounded-2xl bg-white/[0.03] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <a href={q.url} target="_blank" rel="noreferrer" className="truncate text-white/80">{q.url.replace(/^https:\/\/(www\.)?/, "")}</a>
                  <span className="shrink-0 text-xs text-muted">{q.status === "pending" ? (running ? "⏳ Разбираю" : "⏸ Ждёт") : "⚠️ Ошибка"}</span>
                </div>
                {q.errorRu && <p className="mt-1 text-xs text-rose-300">{q.errorRu}</p>}
              </li>
            ))}
          </ul>
        </Reveal>
      )}

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

      {reels.length > 0 && <ReelCatalog reels={reels} />}
    </div>
  );
}

function GettingStarted({ hasCreators }: { hasCreators: boolean }) {
  return (
    <Reveal delay={0.05} className="grid gap-4 md:grid-cols-2">
      <section className="glass rounded-3xl p-6">
        <p className="text-xs font-semibold tracking-widest text-amber-300 uppercase">Быстрый тест</p>
        <h2 className="mt-2 font-display text-lg font-semibold">Вставь ссылку на любой Reels</h2>
        <p className="mt-1 mb-4 text-sm text-muted">Через пару минут здесь появится разбор: почему залетело, сценарий под тебя и 3D-раскадровка.</p>
        <AddReelForm compact />
      </section>
      <section className="rounded-3xl glass p-6">
        <p className="text-xs font-semibold tracking-widest text-muted uppercase">Радар ищет сам</p>
        <ol className="mt-3 space-y-3 text-sm">
          <Step n={1}>Нажми «Запустить сейчас»: найду залёты по твоим темам в Instagram. Первый прогон идёт 10–15 минут</Step>
          <Step n={2}>Дальше ищу сам каждый день в 09:00 и 20:00 по Дубаю</Step>
          <Step n={3} done={hasCreators}>
            Если хочешь, <Link href="/sources" className="font-medium text-amber-200 hover:underline">добавь любимых авторов</Link>, буду следить и за ними
          </Step>
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
