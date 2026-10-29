"use client";

import { useEffect, useRef, useState } from "react";
import { createStyleFromReels, uploadStyleFrame } from "@/app/studio/style-actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const MAX_CLIPS = 5;
const FRAMES_PER_CLIP = 8;
const SCAN_SECONDS = 90; // склейки считаем по первым полутора минутам
const SCAN_STEP = 1 / 3;
const CUT = 30; // средняя разница цвета соседних проб (из 255), выше которой считаем склейку
const INPUT = "w-full rounded-2xl border border-ink/10 bg-paper/30 px-4 py-2.5 text-sm outline-none placeholder:text-ink/30 focus:border-accent/50";

type Clip = { duration: number; cuts: number; frames: { blob: Blob; t: number }[] };

function once(v: HTMLVideoElement, event: string, ms: number) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => (cleanup(), reject(new Error("timeout"))), ms);
    const ok = () => (cleanup(), resolve());
    const bad = () => (cleanup(), reject(new Error("error")));
    const cleanup = () => {
      clearTimeout(t);
      v.removeEventListener(event, ok);
      v.removeEventListener("error", bad);
    };
    v.addEventListener(event, ok);
    v.addEventListener("error", bad);
  });
}

// Пропущенное событие seeked не ломает разбор: проба просто берётся с текущего кадра.
async function seek(v: HTMLVideoElement, t: number) {
  v.currentTime = t;
  await once(v, "seeked", 4000).catch(() => undefined);
}

// Ролик разбирается прямо в браузере: файл никуда не уходит, на сервер едут только 8 кадров по 720 px
// и число склеек (по маленьким пробам каждые 1/3 секунды).
async function readClip(file: File, onPct: (p: number) => void): Promise<Clip> {
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  const src = URL.createObjectURL(file);
  v.src = src;
  try {
    const ready = once(v, "loadedmetadata", 20_000);
    v.load();
    await ready;
    // Safari на iPhone отдаёт кадры только после короткого запуска воспроизведения.
    await v.play().catch(() => undefined);
    v.pause();
    const duration = v.duration;
    if (!Number.isFinite(duration) || duration <= 0 || !v.videoWidth) throw new Error("bad");

    const probe = document.createElement("canvas");
    probe.width = 32;
    probe.height = 32;
    const pc = probe.getContext("2d", { willReadFrequently: true })!;
    const end = Math.min(duration, SCAN_SECONDS);
    let prev: Uint8ClampedArray | null = null;
    let cuts = 0;
    for (let t = 0; t < end; t += SCAN_STEP) {
      await seek(v, t);
      pc.drawImage(v, 0, 0, 32, 32);
      const px = pc.getImageData(0, 0, 32, 32).data;
      if (prev) {
        let diff = 0;
        for (let i = 0; i < px.length; i += 4) diff += (Math.abs(px[i] - prev[i]) + Math.abs(px[i + 1] - prev[i + 1]) + Math.abs(px[i + 2] - prev[i + 2])) / 3;
        if (diff / 1024 > CUT) cuts++;
      }
      prev = px;
      onPct((t / end) * 0.8);
    }

    const k = Math.min(1, 720 / Math.max(v.videoWidth, v.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(v.videoWidth * k);
    canvas.height = Math.round(v.videoHeight * k);
    const ctx = canvas.getContext("2d")!;
    const frames: Clip["frames"] = [];
    for (let i = 0; i < FRAMES_PER_CLIP; i++) {
      const t = Math.min(duration - 0.05, 0.3 + ((duration - 0.6) * i) / (FRAMES_PER_CLIP - 1));
      await seek(v, Math.max(0, t));
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
      if (blob) frames.push({ blob, t: Math.max(0, t) });
      onPct(0.8 + ((i + 1) / FRAMES_PER_CLIP) * 0.2);
    }
    return { duration, cuts: Math.round(cuts * (duration / end)), frames };
  } finally {
    URL.revokeObjectURL(src);
    v.removeAttribute("src");
    v.load();
  }
}

// «Свой стиль из роликов»: 1–5 роликов автора, необязательное название и пожелание, одна главная кнопка.
export function MyStyleMaker({ onDone, onClose }: { onDone: (slug: string) => void; onClose: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState("");
  const [wish, setWish] = useState("");
  const [step, setStep] = useState<string | null>(null);
  const toast = useToast();
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);

  const run = async () => {
    const draft = crypto.randomUUID();
    const clips: { duration: number; cuts: number; frames: { url: string; t: number }[] }[] = [];
    let n = 0;
    try {
      for (const [i, f] of files.entries()) {
        const label = `Смотрю ролик ${i + 1} из ${files.length}`;
        setStep(label);
        let clip: Clip;
        try {
          clip = await readClip(f, (p) => alive.current && setStep(`${label}: ${Math.round(p * 100)}%`));
        } catch {
          toast(`Браузер не открыл «${f.name}». Сохрани ролик как MP4 и попробуй снова`, "error");
          continue;
        }
        const frames: { url: string; t: number }[] = [];
        for (const fr of clip.frames) {
          setStep(`Загружаю кадры ролика ${i + 1}: ${frames.length + 1} из ${clip.frames.length}`);
          const fd = new FormData();
          fd.append("draft", draft);
          fd.append("n", String(n++));
          fd.append("frame", new File([fr.blob], "frame.jpg", { type: "image/jpeg" }));
          const r = await uploadStyleFrame(fd);
          if (r.error) throw new Error(r.error);
          if (r.url) frames.push({ url: r.url, t: fr.t });
        }
        if (frames.length) clips.push({ duration: clip.duration, cuts: clip.cuts, frames });
      }
      if (!clips.length) return setStep(null);
      setStep("Отдаю кадры Claude на разбор");
      const r = await createStyleFromReels({ draft, name, wish, clips });
      if (r.error || !r.slug) throw new Error(r.error ?? "Не получилось");
      toast("Разбираю стиль, это 1–2 минуты. Можно закрыть окно");
      onDone(r.slug);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Не получилось", "error");
      setStep(null);
    }
  };

  const busy = step !== null;
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold">Свой стиль из роликов</p>
          <p className="text-sm text-muted">
            Загрузи 1–{MAX_CLIPS} роликов в одном стиле. Я посмотрю кадры, цвета, шрифты, движение и монтаж и сохраню стиль. Ролики остаются у тебя: на сервер уходят только кадры.
          </p>
        </div>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Закрыть" className="min-h-11 min-w-11 rounded-full neo-btn text-lg disabled:opacity-50">
          ✕
        </button>
      </div>
      <label className={`flex min-h-11 cursor-pointer items-center justify-center rounded-2xl neo-btn px-4 text-sm font-medium focus-within:ring-2 focus-within:ring-accent ${busy ? "pointer-events-none opacity-50" : ""}`}>
        {files.length ? `Выбрано роликов: ${files.length} · выбрать другие` : "Выбрать ролики"}
        <input
          type="file"
          accept="video/*"
          multiple
          disabled={busy}
          className="sr-only"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("video/")).slice(0, MAX_CLIPS))}
        />
      </label>
      {files.length > 0 && (
        <ul className="space-y-1 text-xs text-muted">
          {files.map((f) => (
            <li key={f.name + f.size} className="truncate">
              🎬 {f.name} · {(f.size / 1e6).toFixed(1)} МБ
            </li>
          ))}
        </ul>
      )}
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} disabled={busy} placeholder="Название, можно оставить пустым: придумаю сам" className={INPUT} />
      <textarea
        value={wish}
        onChange={(e) => setWish(e.target.value)}
        maxLength={600}
        rows={2}
        disabled={busy}
        placeholder="Что важно сохранить, если хочешь: «тёмный фон и неоновые цифры», «быстрые склейки»…"
        className={INPUT}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" disabled={busy || files.length === 0} onClick={run}>
          {busy ? "Работаю…" : "Сохранить стиль из роликов"}
        </Button>
        {step && (
          <p className="flex items-center gap-2 text-sm text-accent" aria-live="polite">
            <span className="size-2 animate-ping rounded-full bg-accent motion-reduce:animate-none" /> {step}
          </p>
        )}
      </div>
    </div>
  );
}
