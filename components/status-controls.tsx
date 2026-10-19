"use client";

import { useState } from "react";
import { setReelStatus } from "@/app/actions";
import { REJECT_REASONS, STATUS_LABEL, type ReelStatus } from "@/lib/db/types";

const NEXT: Record<ReelStatus, ReelStatus[]> = {
  new: ["in_work", "rejected"],
  in_work: ["filmed", "rejected"],
  rejected: ["in_work"],
  filmed: ["published", "in_work"],
  published: [],
};

export function StatusControls({ id, status }: { id: string; status: ReelStatus }) {
  const [mode, setMode] = useState<"idle" | "reject" | "publish">("idle");
  const submit = async (fd: FormData) => {
    await setReelStatus(fd);
    setMode("idle");
  };
  const btn = "rounded-md border border-border px-3 py-1.5 text-sm hover:bg-foreground hover:text-background";

  if (mode === "reject") {
    return (
      <form action={submit} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value="rejected" />
        {Object.entries(REJECT_REASONS).map(([k, label]) => (
          <button key={k} name="reason" value={k} className={btn}>{label}</button>
        ))}
        <input name="reasonText" placeholder="Своими словами (необязательно)" className="min-w-48 flex-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm" />
        <button type="button" onClick={() => setMode("idle")} className="text-sm text-muted">Отмена</button>
      </form>
    );
  }

  if (mode === "publish") {
    return (
      <form action={submit} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value="published" />
        <input name="publishedUrl" required type="url" placeholder="Ссылка на твой ролик" className="min-w-64 flex-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm" />
        <button className={btn}>Сохранить</button>
        <button type="button" onClick={() => setMode("idle")} className="text-sm text-muted">Отмена</button>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {NEXT[status].map((s) =>
        s === "rejected" ? (
          <button key={s} onClick={() => setMode("reject")} className={btn}>{STATUS_LABEL[s]}</button>
        ) : s === "published" ? (
          <button key={s} onClick={() => setMode("publish")} className={btn}>{STATUS_LABEL[s]}</button>
        ) : (
          <form key={s} action={setReelStatus}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value={s} />
            <button className={btn}>{STATUS_LABEL[s]}</button>
          </form>
        ),
      )}
    </div>
  );
}
