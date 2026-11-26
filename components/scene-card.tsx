"use client";

import { useState, useTransition } from "react";
import { removeScene, saveScene, toggleScene, uploadScenePhoto } from "@/app/settings/scene-actions";
import { AutoRefresh } from "@/components/studio/auto-refresh";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import type { SceneCard as Scene } from "@/lib/scene";

const MAX = 6;

// Фото уменьшается в браузере до 1600 px по длинной стороне: так запрос лёгкий, а детали студии видны.
async function shrink(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * k);
  canvas.height = Math.round(img.height * k);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  img.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Не получилось прочитать фото"))), "image/jpeg", 0.86));
}

// Моя студия: 1–6 фото места, где автор снимается. Claude описывает её, и она становится сценой роликов организации.
export function SceneCard({ org, scene }: { org: string; scene: Scene | null }) {
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

  const upload = () =>
    start(async () => {
      const draft = crypto.randomUUID();
      const urls: string[] = [];
      for (const [i, p] of photos.entries()) {
        setProgress(`Загружаю фото ${i + 1} из ${photos.length}`);
        const fd = new FormData();
        fd.append("draft", draft);
        fd.append("n", String(i));
        try {
          fd.append("photo", new File([await shrink(p.file)], `studio-${i + 1}.jpg`, { type: "image/jpeg" }));
        } catch {
          continue;
        }
        const r = await uploadScenePhoto(fd);
        if (r.url) urls.push(r.url);
        else if (r.error) {
          setProgress(null);
          return toast(r.error, "error");
        }
      }
      if (!urls.length) {
        setProgress(null);
        return toast("Ни одно фото не прочиталось, попробуй другие", "error");
      }
      setProgress("Разбираю студию");
      const r = await saveScene({ draft, photos: urls });
      setProgress(null);
      if (r.error) return toast(r.error, "error");
      pick([]);
      setRedo(false);
    });

  const analyzing = scene?.status === "analyzing";
  const ready = scene?.status === "ready";
  const picking = !scene || scene.status === "failed" || redo;

  return (
    <div className="space-y-5">
      <AutoRefresh active={analyzing} every={5000} forMs={600_000} />

      {!scene && (
        <p className="text-sm text-muted">
          Загрузи фото места, где ты снимаешься. В сценариях появятся короткие планы, где ты говоришь в камеру прямо в этой студии, вперемешку с кинематографичными сценами. Эскизы и кадры рендера будут держать её узнаваемой.
        </p>
      )}

      {scene && !redo && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {scene.photos.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="Фото студии" className="aspect-video w-full rounded-xl object-cover ring-1 ring-ink/10" />
            ))}
          </div>

          {analyzing && (
            <p className="flex items-center gap-2 text-sm text-accent">
              <span className="size-2 animate-ping rounded-full bg-accent" /> Разбираю студию: свет, фон, технику. Обычно меньше минуты, страница обновится сама.
            </p>
          )}

          {scene.status === "failed" && <p className="text-xs text-rose-300">{scene.error ?? "Не получилось разобрать фото"}. Загрузи фото ещё раз.</p>}

          {ready && (
            <>
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className="flex gap-1" aria-hidden>
                    {scene.palette.map((c) => (
                      <span key={c} className="size-3.5 rounded-full ring-1 ring-ink/10" style={{ background: c }} />
                    ))}
                  </span>
                  {scene.name}
                </p>
                <p className="text-sm leading-relaxed text-muted">{scene.ru}</p>
                <div className="flex flex-wrap gap-1.5">
                  {scene.seen.map((s) => (
                    <span key={s} className="rounded-full bg-ink/[0.05] px-2.5 py-1 text-xs text-muted">
                      {s}
                    </span>
                  ))}
                </div>
                {scene.angles.length > 0 && (
                  <p className="text-xs leading-relaxed text-muted">
                    <span className="font-medium text-foreground">Планы для съёмки:</span> {scene.angles.join(" · ")}
                  </p>
                )}
              </div>
              <Switch
                checked={scene.on}
                label={`Снимать ролики «${org}» в моей студии`}
                hint="1–2 плана в камеру на ролик, остальное мини-фильм"
                onChange={(v) =>
                  start(async () => {
                    const r = await toggleScene(v);
                    if (r.error) toast(r.error, "error");
                  })
                }
              />
            </>
          )}
        </div>
      )}

      {picking && (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            1–{MAX} фото или стоп-кадров: общий план с тобой в кадре и пара деталей (свет, микрофон, фон). Видно комнату целиком, без сильного размытия.
          </p>
          <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-2xl neo-btn px-4 text-sm font-medium focus-within:ring-2 focus-within:ring-accent">
            {photos.length ? `Выбрано фото: ${photos.length}` : "Выбрать фото студии"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => pick(Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/")).slice(0, MAX))}
            />
          </label>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {photos.map(({ url }) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt="" className="aspect-video w-full rounded-xl object-cover" />
              ))}
            </div>
          )}
          {progress ? (
            <p className="flex items-center gap-2 text-sm text-accent">
              <span className="size-2 animate-ping rounded-full bg-accent" /> {progress}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" disabled={busy || photos.length === 0} onClick={upload}>
                {photos.length === 0 ? "Сначала выбери фото" : "Сделать студию сценой роликов"}
              </Button>
              {redo && <Button onClick={() => (pick([]), setRedo(false))}>Оставить прежнюю студию</Button>}
            </div>
          )}
        </div>
      )}

      {scene && !redo && !analyzing && (
        <div className="flex flex-wrap gap-4">
          {ready && (
            <button onClick={() => setRedo(true)} className="min-h-11 text-xs text-muted hover:text-foreground">
              Заменить фото студии
            </button>
          )}
          <button
            disabled={busy}
            onClick={() =>
              start(async () => {
                const r = await removeScene();
                if (r.error) toast(r.error, "error");
              })
            }
            className="min-h-11 text-xs text-muted hover:text-rose-300"
          >
            Убрать студию
          </button>
        </div>
      )}
    </div>
  );
}
