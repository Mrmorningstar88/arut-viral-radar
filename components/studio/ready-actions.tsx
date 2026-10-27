"use client";

import { useState, useTransition } from "react";
import { cancelRender, drawSketches, markPublished, releaseVideo, retryRender } from "@/app/studio/actions";
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

export function DrawSketches({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <Button disabled={pending} onClick={() => start(async () => toast((await drawSketches(id)).error ?? "Рисую кадры, около минуты"))}>
      🎨 Нарисовать кадры
    </Button>
  );
}

// Отмена ролика: сначала спрашиваем, потом возвращаем карточку в сториборд.
export function CancelRender({ id }: { id: string }) {
  const [sure, setSure] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  if (!sure)
    return (
      <Button variant="danger" onClick={() => setSure(true)}>
        ✕ Отменить ролик
      </Button>
    );
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-rose-500/10 p-3">
      <span className="text-sm">Остановить рендер и вернуть в сториборд?</span>
      <Button
        variant="danger"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await cancelRender(id);
            toast(r.error ?? "Отменил. Сториборд можно поправить и запустить снова", r.error ? "error" : undefined);
          })
        }
      >
        {pending ? "Отменяю…" : "Да, отменить"}
      </Button>
      <Button disabled={pending} onClick={() => setSure(false)}>
        Нет, пусть рисует
      </Button>
    </div>
  );
}

// Выложил вручную: отметить ролик ссылкой на пост.
export function PublishForm({ id }: { id: string }) {
  const [url, setUrl] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <div className="space-y-3">
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

// Ссылка с ?download= заставляет Supabase Storage отдать файл как вложение: атрибут download
// браузер игнорирует для чужого домена, и ролик просто открылся бы во вкладке.
export function DownloadVideo({ url, title }: { url: string; title: string }) {
  const name = `${title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60) || "yoomp"}.mp4`;
  const href = `${url}${url.includes("?") ? "&" : "?"}download=${encodeURIComponent(name)}`;
  return (
    <a href={href} className="inline-flex min-h-11 items-center gap-2 rounded-2xl neo-btn px-4 text-sm font-medium">
      ↓ Скачать ролик
    </a>
  );
}
