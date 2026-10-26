"use client";

import { useState, useTransition } from "react";
import { createScripts } from "@/app/studio/actions";
import { AutoRefresh } from "@/components/studio/auto-refresh";
import { useToast } from "@/components/ui/toast";

const COUNTS = [10, 30] as const;

export function GenerateScripts() {
  const [pending, start] = useTransition();
  const [waiting, setWaiting] = useState(false);
  const [wish, setWish] = useState("");
  const [count, setCount] = useState<(typeof COUNTS)[number]>(10);
  const toast = useToast();
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <AutoRefresh active={waiting} every={8000} forMs={300_000} />
      <input
        value={wish}
        onChange={(e) => setWish(e.target.value)}
        placeholder="Пожелание к темам (необязательно)"
        className="w-full rounded-full border border-white/10 bg-black/30 px-4 py-2.5 text-sm outline-none transition placeholder:text-white/30 focus:border-amber-400/50 sm:w-64"
      />
      <div className="flex shrink-0 rounded-full bg-white/[0.05] p-0.5 text-sm">
        {COUNTS.map((n) => (
          <button key={n} type="button" onClick={() => setCount(n)} className={`rounded-full px-3 py-2 ${count === n ? "bg-white text-black" : "text-muted hover:text-foreground"}`}>
            {n}
          </button>
        ))}
      </div>
      <button
        disabled={pending || waiting}
        onClick={() =>
          start(async () => {
            const r = await createScripts(wish, count);
            if (r.error) return toast(r.error, "error");
            setWish("");
            setWaiting(true);
            toast(`Пишу ${count} сценариев, через 2–3 минуты появятся в первой колонке`);
          })
        }
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[linear-gradient(180deg,#ff9a55,#ff7a2f_55%,#f06a20)] px-5 py-2.5 text-sm font-semibold text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_10px_40px_-12px_rgba(255,122,47,0.75)] transition disabled:opacity-60"
      >
        {waiting && <span className="size-2 animate-ping rounded-full bg-black" />}
        {pending ? "Запускаю…" : waiting ? "Пишу сценарии…" : "✦ Новые сценарии"}
      </button>
    </div>
  );
}
