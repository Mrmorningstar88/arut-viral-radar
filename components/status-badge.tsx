import { STATUS_LABEL, type ReelStatus } from "@/lib/db/types";

const TONE: Record<ReelStatus, string> = {
  new: "bg-sky-400/10 text-sky-300 ring-sky-400/20",
  in_work: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
  rejected: "bg-white/5 text-white/40 ring-white/10",
  filmed: "bg-violet-400/10 text-violet-300 ring-violet-400/20",
  published: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20",
};

export function StatusBadge({ status }: { status: ReelStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${TONE[status]}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}
