"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { setReelStatus } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { REJECT_REASONS, STATUS_LABEL, type ReelStatus } from "@/lib/db/types";

const NEXT: Record<ReelStatus, ReelStatus[]> = {
  new: ["in_work", "rejected"],
  in_work: ["filmed", "rejected"],
  rejected: ["in_work"],
  filmed: ["published", "in_work"],
  published: [],
};

const DONE_MSG: Record<ReelStatus, string> = {
  new: "Вернул в новые",
  in_work: "Взял в работу 🔥",
  rejected: "Убрал. Учту на будущее",
  filmed: "Снято, отлично 🎬",
  published: "Выложено! Начну следить за метриками 📈",
};

const VARIANT = { in_work: "primary", rejected: "danger", filmed: "ghost", published: "success", new: "ghost" } as const;

export function StatusControls({ id, status }: { id: string; status: ReelStatus }) {
  const [mode, setMode] = useState<"idle" | "reject" | "publish">("idle");
  const [pending, start] = useTransition();
  const toast = useToast();

  const send = (fields: Record<string, string>) =>
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      for (const [k, v] of Object.entries(fields)) fd.set(k, v);
      try {
        await setReelStatus(fd);
        setMode("idle");
        toast(DONE_MSG[fields.status as ReelStatus]);
      } catch (e) {
        toast(e instanceof Error ? e.message : "Не получилось", "error");
      }
    });

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <AnimatePresence mode="wait" initial={false}>
        {mode === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex flex-wrap gap-2">
            {NEXT[status].map((s) => (
              <Button
                key={s}
                variant={VARIANT[s]}
                disabled={pending}
                onClick={() => (s === "rejected" ? setMode("reject") : s === "published" ? setMode("publish") : send({ status: s }))}
              >
                {STATUS_LABEL[s]}
              </Button>
            ))}
          </motion.div>
        )}

        {mode === "reject" && (
          <motion.div key="reject" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-2">
            <p className="text-xs text-muted">Почему не подходит? Это учит систему твоему вкусу.</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(REJECT_REASONS).map(([k, label], i) => (
                <motion.button
                  key={k}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1, transition: { delay: i * 0.03 } }}
                  whileTap={{ scale: 0.94 }}
                  disabled={pending}
                  onClick={() => send({ status: "rejected", reason: k })}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm hover:border-rose-400/40 hover:bg-rose-500/10"
                >
                  {label}
                </motion.button>
              ))}
              <button onClick={() => setMode("idle")} className="px-2 text-sm text-muted hover:text-foreground">Отмена</button>
            </div>
          </motion.div>
        )}

        {mode === "publish" && (
          <motion.form
            key="publish"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            onSubmit={(e) => {
              e.preventDefault();
              send({ status: "published", publishedUrl: String(new FormData(e.currentTarget).get("publishedUrl")) });
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <input name="publishedUrl" required type="url" autoFocus placeholder="Ссылка на твой ролик" className="min-w-64 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-amber-400/50" />
            <Button variant="success" type="submit" disabled={pending}>Сохранить</Button>
            <button type="button" onClick={() => setMode("idle")} className="px-2 text-sm text-muted hover:text-foreground">Отмена</button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
