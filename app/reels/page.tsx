import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { StatusControls } from "@/components/status-controls";
import { getRepo } from "@/lib/db";
import { REEL_STATUSES, STATUS_LABEL, type ReelStatus } from "@/lib/db/types";
import { compact, dubaiDate } from "@/lib/format";

const LANE_LABEL: Record<string, string> = { viral: "Залёт", rising: "Растёт", queue: "Из очереди" };

export default async function ReelsPage({ searchParams }: PageProps<"/reels">) {
  const raw = (await searchParams).status;
  const status = REEL_STATUSES.find((s) => s === raw) as ReelStatus | undefined;
  const reels = await (await getRepo()).listReels(status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        <Filter href="/reels" active={!status} label="Все" />
        {REEL_STATUSES.map((s) => (
          <Filter key={s} href={`/reels?status=${s}`} active={status === s} label={STATUS_LABEL[s]} />
        ))}
      </div>

      {reels.length === 0 && <p className="text-muted">Здесь пока пусто.</p>}

      <ul className="space-y-3">
        {reels.map((r) => (
          <li key={r.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <StatusBadge status={r.status} />
              {r.lanes.map((l) => (
                <span key={l} className="rounded bg-foreground/5 px-2 py-0.5 text-xs">{LANE_LABEL[l] ?? l}</span>
              ))}
              {r.fitScore != null && <span className="text-xs text-muted">Подходит: {r.fitScore}/100</span>}
              <span className="ml-auto text-xs text-muted">@{r.author} · {dubaiDate(r.postedAt)}</span>
            </div>
            <Link href={`/reels/${r.id}`} className="mt-2 block font-medium hover:underline">{r.caption ?? r.url}</Link>
            <p className="mt-1 text-sm text-muted">
              {compact(r.views)} просмотров · {compact(r.likes)} лайков · {compact(r.comments)} комментов
            </p>
            {r.fitReason && <p className="mt-1 text-sm">{r.fitReason}</p>}
            <div className="mt-3">
              <StatusControls id={r.id} status={r.status} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Filter({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link href={href} className={`rounded-full border px-3 py-1 ${active ? "border-foreground" : "border-border text-muted"}`}>
      {label}
    </Link>
  );
}
