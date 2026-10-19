import { STATUS_LABEL, type ReelStatus } from "@/lib/db/types";

const TONE: Record<ReelStatus, string> = {
  new: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  in_work: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  rejected: "bg-zinc-500/15 text-muted",
  filmed: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  published: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

export function StatusBadge({ status }: { status: ReelStatus }) {
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${TONE[status]}`}>{STATUS_LABEL[status]}</span>;
}
