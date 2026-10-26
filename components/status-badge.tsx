import { STATUS_LABEL, type ReelStatus } from "@/lib/db/types";

const TONE: Record<ReelStatus, string> = {
  new: "bg-sky-500/10 text-sky-800 ring-sky-500/25",
  in_work: "bg-accent/10 text-accent ring-accent/25",
  rejected: "bg-ink/5 text-muted ring-ink/10",
  filmed: "bg-violet-400/10 text-violet-800 ring-violet-400/25",
  published: "bg-emerald-400/10 text-emerald-200 ring-emerald-400/25",
};

export function StatusBadge({ status }: { status: ReelStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${TONE[status]}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}
