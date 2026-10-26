"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Shot } from "@/lib/generate/schema";
import { CopyButton } from "@/components/ui/copy-button";

const Scene3D = dynamic(() => import("./scene3d"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 animate-pulse bg-ink/5" />,
});

type Vo = { t: string; text: string };

const SHOT_LABEL = { close: "Крупный", medium: "Средний", wide: "Общий" } as const;
const CAMERA_LABEL = { static: "Статика", push_in: "Наезд", pull_out: "Отъезд", orbit: "Облёт", pan: "Панорама" } as const;

function parseRange(t: string): [number, number] {
  const [a, b] = t.split(/[-–]/).map((x) => parseFloat(x));
  return [a || 0, Number.isFinite(b) ? b : (a || 0) + 3];
}

export function StoryboardStudio({ storyboard, vo }: { storyboard: Shot[]; vo: Vo[] }) {
  const starts = useMemo(
    () => storyboard.map((_, i) => storyboard.slice(0, i).reduce((sum, s) => sum + s.dur, 0)),
    [storyboard],
  );
  const total = storyboard.reduce((sum, s) => sum + s.dur, 0);

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timeRef = useRef(0);
  const progress = useRef(0);

  const idx = Math.max(0, starts.findLastIndex((st) => st <= time));
  const shot = storyboard[idx];

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let lastUi = 0;
    const tick = (now: number) => {
      timeRef.current = (timeRef.current + (now - last) / 1000) % total;
      last = now;
      const i = Math.max(0, starts.findLastIndex((st) => st <= timeRef.current));
      progress.current = (timeRef.current - starts[i]) / storyboard[i].dur;
      if (now - lastUi > 80) {
        setTime(timeRef.current);
        lastUi = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, total, starts, storyboard]);

  const seek = (t: number) => {
    timeRef.current = t;
    const i = Math.max(0, starts.findLastIndex((st) => st <= t));
    progress.current = (t - starts[i]) / storyboard[i].dur;
    setTime(t);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(260px,340px)_1fr]">
      <div className="lg:sticky lg:top-20 lg:self-start">
        <div className="relative mx-auto aspect-[9/16] w-full max-w-[340px] overflow-hidden rounded-[28px] border border-ink/10 bg-black shadow-[0_30px_80px_-20px_rgba(75,87,232,0.3)]">
          <Scene3D scene={shot.scene} progress={progress} />

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3 text-[11px] font-medium text-ink/80">
            <span className="rounded-full bg-paper/50 px-2 py-1 backdrop-blur">Кадр {shot.n} · {SHOT_LABEL[shot.scene.shot]}</span>
            <span className="rounded-full bg-paper/50 px-2 py-1 tabular-nums backdrop-blur">{time.toFixed(1)} / {total} с</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={shot.n}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="pointer-events-none absolute inset-x-4 bottom-[22%] text-center"
            >
              <span className="inline-block rounded-xl bg-paper px-3 py-2 text-base leading-tight font-extrabold text-ink shadow-lg">
                {shot.overlay}
              </span>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            <motion.div
              key={`flash-${shot.n}`}
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="pointer-events-none absolute inset-0 bg-black"
            />
          </AnimatePresence>
        </div>

        <div className="mx-auto mt-4 max-w-[340px] space-y-3">
          <div className="flex h-2 gap-1">
            {storyboard.map((s, i) => {
              const fill = i < idx ? 1 : i === idx ? (time - starts[i]) / s.dur : 0;
              return (
                <button
                  key={s.n}
                  onClick={() => seek(starts[i])}
                  style={{ flexGrow: s.dur }}
                  className="relative overflow-hidden rounded-full bg-ink/10 transition hover:bg-ink/20"
                  aria-label={`Кадр ${s.n}`}
                >
                  <span className="absolute inset-y-0 left-0 rounded-full bg-ink/80" style={{ width: `${Math.min(1, fill) * 100}%` }} />
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-2">
            <IconButton label="Предыдущий кадр" onClick={() => seek(starts[Math.max(0, idx - 1)])}>⏮</IconButton>
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setPlaying((p) => !p)}
              className="grid size-12 place-items-center rounded-full bg-[linear-gradient(180deg,#7b8cff,#5b6cff)] text-lg text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_28px_-8px_rgba(91,108,255,0.8)]"
              aria-label={playing ? "Пауза" : "Играть"}
            >
              {playing ? "❚❚" : "▶"}
            </motion.button>
            <IconButton label="Следующий кадр" onClick={() => seek(starts[(idx + 1) % storyboard.length])}>⏭</IconButton>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="mb-3 text-xs font-semibold tracking-[0.2em] text-muted uppercase">Голос</h3>
          <ol className="space-y-1.5">
            {vo.map((v, i) => {
              const [a, b] = parseRange(v.t);
              const active = time >= a && time < b;
              return (
                <motion.li
                  key={i}
                  onClick={() => seek(Math.min(a, total - 0.01))}
                  animate={{ opacity: active ? 1 : 0.55, x: active ? 4 : 0 }}
                  className={`flex cursor-pointer gap-3 rounded-xl px-3 py-2 transition-colors ${active ? "bg-amber-400/10 ring-1 ring-amber-400/40" : "hover:bg-ink/5"}`}
                >
                  <span className="w-16 shrink-0 pt-0.5 font-mono text-xs whitespace-nowrap text-amber-300/80">{v.t} с</span>
                  <span className="text-[15px] leading-relaxed">{v.text}</span>
                </motion.li>
              );
            })}
          </ol>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">Кадры</h3>
            <CopyButton text={storyboard.map((s) => `${s.n}. ${s.prompt}`).join("\n\n")} label="Все промпты" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {storyboard.map((s, i) => (
              <motion.div
                key={s.n}
                onClick={() => seek(starts[i])}
                animate={{ scale: i === idx ? 1 : 0.985 }}
                className={`cursor-pointer rounded-2xl border p-4 text-sm transition-colors ${i === idx ? "border-amber-400/60 bg-amber-400/[0.06]" : "border-border bg-card hover:border-ink/20"}`}
              >
                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="font-semibold text-foreground">Кадр {s.n}</span>
                  <span className="tabular-nums">{s.dur} с</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Chip>{SHOT_LABEL[s.scene.shot]}</Chip>
                  <Chip>{CAMERA_LABEL[s.scene.camera]}</Chip>
                </div>
                <p className="mt-2">{s.frame}</p>
                <p className="mt-1 font-semibold">«{s.overlay}»</p>
                <div className="mt-3 rounded-xl bg-paper/30 p-2.5 font-mono text-[11px] leading-relaxed text-ink/70">{s.prompt}</div>
                <div className="mt-2 flex justify-end" onClick={(e) => e.stopPropagation()}>
                  <CopyButton text={s.prompt} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] text-ink/70">{children}</span>;
}

function IconButton({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      aria-label={label}
      className="grid size-10 place-items-center rounded-full border border-ink/10 bg-ink/5 text-sm text-ink/80 hover:bg-ink/10"
    >
      {children}
    </motion.button>
  );
}
