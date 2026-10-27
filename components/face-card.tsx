"use client";

import { useActionState, useState, useTransition } from "react";
import { connectHiggsfield, disconnectHiggsfield, setFace, trainFace, uploadFacePhoto } from "@/app/settings/actions";
import { AutoRefresh } from "@/components/studio/auto-refresh";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";

type Soul = { status: "not_ready" | "queued" | "in_progress" | "completed" | "failed"; thumb?: string | null };
const INPUT = "w-full rounded-xl border border-ink/10 bg-paper/30 px-3 py-2 text-sm outline-none focus:border-accent/60";
const MIN = 5;
const MAX = 20;

// Фото уменьшается в браузере до 1280 px по длинной стороне: так запрос лёгкий, а лицо видно хорошо.
async function shrink(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const k = Math.min(1, 1280 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * k);
  canvas.height = Math.round(img.height * k);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  img.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Не получилось прочитать фото"))), "image/jpeg", 0.88));
}

// Свой образ в роликах: ключ Higgsfield один раз, потом 5–20 фото лица, и образ включается для организации.
export function FaceCard({ org, connected, soul, on, error }: { org: string; connected: boolean; soul: Soul | null; on: boolean; error: string | null }) {
  const [state, action, pending] = useActionState(connectHiggsfield, null);
  const [busy, start] = useTransition();
  const toast = useToast();
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [redo, setRedo] = useState(false);

  // Превью живут, пока выбраны фото: старые ссылки освобождаются при новом выборе.
  const pick = (files: File[]) =>
    setPhotos((old) => {
      old.forEach((p) => URL.revokeObjectURL(p.url));
      return files.map((file) => ({ file, url: URL.createObjectURL(file) }));
    });

  if (!connected)
    return (
      <form action={action} className="space-y-3">
        <p className="text-sm text-muted">
          В роликах снимаешься ты сам, а не мультяшный герой. Создай ключ в console.higgsfield.ai → API keys, пополни там баланс и вставь сюда ID ключа и секрет.
        </p>
        <input name="id" required placeholder="ID ключа Higgsfield" autoComplete="off" className={INPUT} />
        <input name="secret" required type="password" placeholder="Секрет ключа" autoComplete="off" className={INPUT} />
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Проверяю…" : "Подключить Higgsfield"}
        </Button>
        {state && <p className={`text-xs ${state.error ? "text-rose-300" : "text-emerald-300"}`}>{state.error ?? state.message}</p>}
      </form>
    );

  const learning = soul && soul.status !== "completed" && soul.status !== "failed";
  const ready = soul?.status === "completed";

  const train = () =>
    start(async () => {
      const urls: string[] = [];
      for (const [i, p] of photos.entries()) {
        setProgress(`Загружаю фото ${i + 1} из ${photos.length}`);
        const fd = new FormData();
        try {
          fd.append("photo", new File([await shrink(p.file)], `face-${i + 1}.jpg`, { type: "image/jpeg" }));
        } catch {
          continue;
        }
        const r = await uploadFacePhoto(fd);
        if (r.url) urls.push(r.url);
        else if (r.error) {
          setProgress(null);
          return toast(r.error, "error");
        }
      }
      setProgress("Запускаю обучение");
      const r = await trainFace(urls);
      setProgress(null);
      toast(r.error ?? r.message ?? "", r.error ? "error" : undefined);
      if (!r.error) {
        pick([]);
        setRedo(false);
      }
    });

  return (
    <div className="space-y-5">
      <AutoRefresh active={!!learning} every={10_000} forMs={1_200_000} />
      {error && <p className="text-xs text-rose-300">{error}</p>}

      {learning && (
        <p className="flex items-center gap-2 text-sm text-accent">
          <span className="size-2 animate-ping rounded-full bg-accent" /> Обучаю твой образ, обычно несколько минут. Страница обновится сама.
        </p>
      )}

      {ready && !redo && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {soul?.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={soul.thumb} alt="Твой образ" className="size-16 rounded-2xl object-cover" />
            ) : (
              <span className="grid size-16 place-items-center rounded-2xl glass-inset text-2xl">🙂</span>
            )}
            <p className="text-sm">
              <span className="font-medium text-emerald-300">Образ готов.</span>
              <span className="block text-xs text-muted">Кадры с тобой рисуются в Higgsfield и оживают в видео.</span>
            </p>
          </div>
          <Switch
            checked={on}
            label={`Снимать меня в роликах «${org}»`}
            hint="Ты становишься героем ключевых кадров"
            onChange={(v) =>
              start(async () => {
                const r = await setFace(v);
                if (r.error) toast(r.error, "error");
              })
            }
          />
          <p className="text-xs text-muted">Каждый ролик с тобой тратит баланс Higgsfield: примерно $1–3 за 30 секунд видео.</p>
        </div>
      )}

      {((!soul && !learning) || soul?.status === "failed" || redo) && (
        <div className="space-y-3">
          {soul?.status === "failed" && <p className="text-xs text-rose-300">Образ не обучился. Попробуй другие фото: лицо крупно, хороший свет, без очков и масок.</p>}
          <p className="text-sm text-muted">
            Загрузи {MIN}–{MAX} своих фото: лицо видно чётко, разные ракурсы и свет, можно селфи. Один раз, потом образ работает во всех роликах.
          </p>
          <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-2xl neo-btn px-4 text-sm font-medium focus-within:ring-2 focus-within:ring-accent">
            {photos.length ? `Выбрано фото: ${photos.length}` : "Выбрать фото"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => pick(Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/")).slice(0, MAX))}
            />
          </label>
          {photos.length > 0 && (
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {photos.map(({ url }) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt="" className="aspect-square w-full rounded-xl object-cover" />
              ))}
            </div>
          )}
          {progress ? (
            <p className="flex items-center gap-2 text-sm text-accent">
              <span className="size-2 animate-ping rounded-full bg-accent" /> {progress}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" disabled={busy || photos.length < MIN} onClick={train}>
                {photos.length < MIN ? `Нужно ещё ${MIN - photos.length} фото` : "Обучить мой образ"}
              </Button>
              {redo && <Button onClick={() => setRedo(false)}>Оставить прежний образ</Button>}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        {ready && !redo && (
          <button onClick={() => setRedo(true)} className="text-xs text-muted hover:text-foreground">
            Переобучить по новым фото
          </button>
        )}
        <button onClick={() => start(async () => void (await disconnectHiggsfield()))} className="text-xs text-muted hover:text-rose-300">
          Отключить Higgsfield
        </button>
      </div>
    </div>
  );
}
