"use client";

import { useState, useTransition } from "react";
import { markPublished, releaseVideo, retryRender } from "@/app/studio/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function RetryRender({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <Button disabled={pending} onClick={() => start(async () => toast((await retryRender(id)).error ?? "Поставил в очередь заново"))}>
      ↻ Рендерить заново
    </Button>
  );
}

// Пока автопостинг не подключён: скачать ролик, выложить и отметить ссылкой на пост.
export function PublishForm({ id, videoUrl }: { id: string; videoUrl: string }) {
  const [url, setUrl] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <div className="space-y-3">
      <a href={videoUrl} download className="inline-flex rounded-xl bg-paper px-4 py-2 text-sm font-semibold text-ink">
        ↓ Скачать ролик
      </a>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Ссылка на пост в Instagram или TikTok"
          className="w-full rounded-2xl border border-ink/10 bg-paper/30 px-4 py-2.5 text-sm outline-none placeholder:text-ink/30 focus:border-accent/50"
        />
        <Button
          variant="primary"
          disabled={pending}
          className="shrink-0"
          onClick={() =>
            start(async () => {
              const r = await markPublished(id, url);
              toast(r.error ?? "Отметил как опубликованный", r.error ? "error" : undefined);
            })
          }
        >
          ✓ Опубликовано
        </Button>
      </div>
    </div>
  );
}

// «Выпустить»: отмечаешь площадки, подключённые к организации, и ролик уходит туда через Metricool.
export function ReleaseForm({ id, networks }: { id: string; networks: { id: string; label: string }[] }) {
  const [picked, setPicked] = useState<string[]>(networks.map((n) => n.id));
  const [pending, start] = useTransition();
  const toast = useToast();
  if (networks.length === 0)
    return (
      <p className="rounded-2xl bg-ink/[0.04] px-4 py-3 text-sm text-muted">
        Чтобы выпускать ролики одной кнопкой, подключи соцсети организации в{" "}
        <a href="/settings" className="text-accent hover:underline">
          Настройках
        </a>
        .
      </p>
    );
  return (
    <div className="space-y-3 rounded-2xl bg-accent/[0.07] p-4 ring-1 ring-accent/25">
      <p className="text-sm font-medium">Выпустить в:</p>
      <div className="flex flex-wrap gap-2">
        {networks.map((n) => {
          const on = picked.includes(n.id);
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => setPicked((xs) => (on ? xs.filter((x) => x !== n.id) : [...xs, n.id]))}
              className={`rounded-full px-4 py-1.5 text-sm transition ${on ? "neo-on" : "bg-ink/[0.06] text-muted"}`}
            >
              {on ? "☑" : "☐"} {n.label}
            </button>
          );
        })}
      </div>
      <Button
        variant="primary"
        disabled={pending || picked.length === 0}
        onClick={() =>
          start(async () => {
            const r = await releaseVideo(id, picked);
            toast(r.error ?? "Ролик отправлен, через пару минут он выйдет", r.error ? "error" : undefined);
          })
        }
      >
        {pending ? "Отправляю…" : "🚀 Выпустить"}
      </Button>
    </div>
  );
}
