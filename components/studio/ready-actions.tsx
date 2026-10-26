"use client";

import { useState, useTransition } from "react";
import { markPublished, retryRender } from "@/app/studio/actions";
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
      <a href={videoUrl} download className="inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">
        ↓ Скачать ролик
      </a>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Ссылка на пост в Instagram или TikTok"
          className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-amber-400/50"
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
