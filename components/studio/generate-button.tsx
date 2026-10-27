"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { createScripts } from "@/app/studio/actions";
import { AutoRefresh } from "@/components/studio/auto-refresh";
import { useToast } from "@/components/ui/toast";
import { asLang, LANGS, type Lang } from "@/lib/studio/lang";

const COUNTS = [10, 30] as const;

// Язык запоминаем в браузере: обычно пишут на одном и том же.
const langListeners = new Set<() => void>();
const onLang = (cb: () => void) => (langListeners.add(cb), () => void langListeners.delete(cb));
let memoryLang: Lang | null = null;
const readLang = (): Lang => {
  if (memoryLang) return memoryLang;
  try {
    return asLang(localStorage.getItem("yoomp.lang"));
  } catch {
    return "ru";
  }
};
const pickLang = (l: Lang) => {
  memoryLang = l;
  try {
    localStorage.setItem("yoomp.lang", l);
  } catch {}
  langListeners.forEach((cb) => cb());
};

export function GenerateScripts() {
  const [pending, start] = useTransition();
  const [waiting, setWaiting] = useState(false);
  const [wish, setWish] = useState("");
  const [count, setCount] = useState<(typeof COUNTS)[number]>(10);
  const lang = useSyncExternalStore(onLang, readLang, () => "ru" as Lang);
  const toast = useToast();
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <AutoRefresh active={waiting} every={8000} forMs={300_000} />
      <input
        value={wish}
        onChange={(e) => setWish(e.target.value)}
        placeholder="Пожелание к темам (необязательно)"
        className="w-full rounded-full border border-ink/10 bg-paper/30 px-4 py-2.5 text-sm outline-none transition placeholder:text-ink/30 focus:border-accent/50 sm:w-64"
      />
      <label className="sr-only" htmlFor="script-lang">
        Язык сценариев
      </label>
      <select
        id="script-lang"
        value={lang}
        onChange={(e) => pickLang(asLang(e.target.value))}
        title="Язык озвучки и надписей"
        className="min-h-11 shrink-0 rounded-full border border-ink/10 bg-paper/30 px-4 text-sm outline-none focus:border-accent/50"
      >
        {(Object.keys(LANGS) as Lang[]).map((l) => (
          <option key={l} value={l}>
            {LANGS[l].label}
          </option>
        ))}
      </select>
      <div className="flex shrink-0 rounded-full bg-ink/[0.05] p-0.5 text-sm">
        {COUNTS.map((n) => (
          <button key={n} type="button" onClick={() => setCount(n)} className={`rounded-full px-3 py-2 ${count === n ? "neo-on" : "text-muted hover:text-foreground"}`}>
            {n}
          </button>
        ))}
      </div>
      <button
        disabled={pending || waiting}
        onClick={() =>
          start(async () => {
            const r = await createScripts(wish, count, lang);
            if (r.error) return toast(r.error, "error");
            setWish("");
            setWaiting(true);
            toast(`Пишу ${count} сценариев, через 2–3 минуты появятся в первой колонке`);
          })
        }
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full neo-primary px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
      >
        {waiting && <span className="size-2 animate-ping rounded-full bg-white" />}
        {pending ? "Запускаю…" : waiting ? "Пишу сценарии…" : "✦ Новые сценарии"}
      </button>
    </div>
  );
}
