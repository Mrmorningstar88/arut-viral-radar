"use client";

import { useEffect, useState } from "react";
import { myStyles, removeMyStyle } from "@/app/studio/style-actions";
import { useToast } from "@/components/ui/toast";
import { MyStyleMaker } from "@/components/studio/my-style-maker";
import {
  OPUS_FILM,
  OPUS_FRAME,
  OPUS_STYLES,
  styleBySlug,
  type MyStyleCard,
} from "@/lib/studio/styles";

// Галерея стилей: сверху «Мои стили» из роликов автора, ниже библиотека lemo-opuscar по категориям
// (кадр, название, жанры и кнопка «Пример» с фильмом-образцом).
export function StyleGallery({
  current,
  onPick,
  disabled,
  mine,
  onMine,
}: {
  current: string | null;
  onPick: (slug: string) => void;
  disabled?: boolean;
  mine: MyStyleCard[];
  onMine: (list: MyStyleCard[]) => void;
}) {
  const [film, setFilm] = useState<string | null>(null);
  const categories = [...new Set(OPUS_STYLES.map((s) => s.category))];
  return (
    <>
      <MyStyles current={current} onPick={onPick} disabled={disabled} mine={mine} onMine={onMine} />
      {categories.map((cat) => (
        <div key={cat} className="mt-5">
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
            {cat}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {OPUS_STYLES.filter((s) => s.category === cat).map((s) => (
              <div
                key={s.slug}
                className={`group relative overflow-hidden rounded-2xl ring-1 transition ${s.slug === current ? "ring-2 ring-accent" : "ring-ink/10 hover:ring-ink/30"}`}
              >
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onPick(s.slug)}
                  className="block w-full text-left disabled:opacity-60"
                  aria-pressed={s.slug === current}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={OPUS_FRAME(s.slug)}
                    alt=""
                    loading="lazy"
                    className="aspect-video w-full object-cover transition group-hover:scale-[1.03]"
                  />
                  <span className="block px-2.5 pt-2 text-xs font-medium">
                    {s.slug === current && "✓ "}
                    {s.name}
                  </span>
                  <span className="block truncate px-2.5 pb-2 text-[11px] text-muted">
                    {s.uses.join(" · ")}
                  </span>
                </button>
                {s.slug !== "my-style" && (
                  <button
                    type="button"
                    onClick={() => setFilm(s.slug)}
                    className="absolute top-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-black/80"
                  >
                    ▶ Пример
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <p className="mt-4 text-[11px] text-muted">
        Стили, кадры и примеры:{" "}
        <a
          href="https://github.com/lemomo-ai/lemo-opuscar"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          lemo-opuscar
        </a>{" "}
        (CC BY 4.0).
      </p>
      {film && (
        <FilmLightbox
          slug={film}
          onClose={() => setFilm(null)}
          onPick={disabled ? undefined : () => (onPick(film), setFilm(null))}
          picked={film === current}
        />
      )}
    </>
  );
}

function FilmLightbox({
  slug,
  onClose,
  onPick,
  picked,
}: {
  slug: string;
  onClose: () => void;
  onPick?: () => void;
  picked: boolean;
}) {
  const st = styleBySlug(slug);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      role="dialog"
      aria-modal
      aria-label={`Пример стиля ${st?.name ?? slug}`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl space-y-3 rounded-3xl bg-[#14121f] p-4 text-white"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-semibold">{st?.name}</p>
            <p className="text-sm text-white/60">{st?.line}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="min-h-11 min-w-11 rounded-full bg-white/10 text-lg hover:bg-white/20"
          >
            ✕
          </button>
        </div>
        <video
          src={OPUS_FILM(slug)}
          poster={OPUS_FRAME(slug)}
          controls
          autoPlay
          playsInline
          preload="metadata"
          className="aspect-video w-full rounded-2xl bg-black"
        />
        <div className="flex flex-wrap items-center gap-3">
          {onPick && (
            <button
              type="button"
              onClick={onPick}
              className="min-h-11 rounded-2xl neo-primary px-5 text-sm font-semibold text-white"
            >
              {picked ? "✓ Этот стиль выбран" : "Выбрать этот стиль"}
            </button>
          )}
          <a
            href={OPUS_FILM(slug)}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-white/60 underline"
          >
            Не играет? Открыть пример отдельно
          </a>
        </div>
      </div>
    </div>
  );
}

// Пока Claude разбирает ролики, список своих стилей обновляется раз в 5 секунд (не дольше 6 минут).
function MyStyles({ current, onPick, disabled, mine, onMine }: { current: string | null; onPick: (slug: string) => void; disabled?: boolean; mine: MyStyleCard[]; onMine: (list: MyStyleCard[]) => void }) {
  const [making, setMaking] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const analyzing = mine.some((m) => m.status === "analyzing");
  useEffect(() => {
    if (!analyzing) return;
    const started = Date.now();
    const t = setInterval(async () => {
      if (Date.now() - started > 360_000) return clearInterval(t);
      const r = await myStyles();
      if (r.items) onMine(r.items);
    }, 5000);
    return () => clearInterval(t);
  }, [analyzing, onMine]);
  const shown = mine.find((m) => m.slug === open);

  return (
    <div className="mt-5">
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Мои стили</h3>
      {making ? (
        <div className="rounded-2xl glass-inset p-4">
          <MyStyleMaker
            onClose={() => setMaking(false)}
            onDone={async (slug) => {
              setMaking(false);
              const r = await myStyles();
              if (r.items) onMine(r.items);
              setOpen(slug);
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMaking(true)}
            className="flex aspect-video flex-col items-center justify-center gap-1 rounded-2xl neo-btn p-3 text-center disabled:opacity-60 sm:aspect-auto sm:min-h-32"
          >
            <span className="text-2xl leading-none text-accent">＋</span>
            <span className="text-xs font-medium">Свой стиль из роликов</span>
            <span className="text-[11px] text-muted">1–5 твоих роликов</span>
          </button>
          {mine.map((m) => (
            <div key={m.slug} className={`group relative overflow-hidden rounded-2xl ring-1 transition ${m.slug === current ? "ring-2 ring-accent" : "ring-ink/10 hover:ring-ink/30"}`}>
              <button
                type="button"
                disabled={disabled || m.status !== "ready"}
                onClick={() => onPick(m.slug)}
                className="block w-full text-left disabled:cursor-default"
                aria-pressed={m.slug === current}
              >
                {m.frames[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.frames[0]} alt="" loading="lazy" className={`aspect-video w-full object-cover transition group-hover:scale-[1.03] ${m.status === "ready" ? "" : "opacity-50"}`} />
                ) : (
                  <span className="block aspect-video w-full bg-ink/5" />
                )}
                <span className="block px-2.5 pt-2 text-xs font-medium">
                  {m.slug === current && "✓ "}
                  {m.status === "analyzing" ? "Разбираю ролики…" : m.name}
                </span>
                <span className={`block truncate px-2.5 pb-2 text-[11px] ${m.status === "failed" ? "text-rose-300" : "text-muted"}`}>
                  {m.status === "ready" ? m.uses.join(" · ") : m.status === "failed" ? "Не получилось" : "1–2 минуты"}
                </span>
              </button>
              {m.status === "analyzing" && <span className="absolute top-2 left-2 size-2 animate-ping rounded-full bg-accent motion-reduce:animate-none" />}
              {m.status !== "analyzing" && (
                <button
                  type="button"
                  onClick={() => setOpen(m.slug)}
                  className="absolute top-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-black/80"
                >
                  Подробнее
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {shown && shown.status !== "analyzing" && (
        <MyStyleLightbox
          style={shown}
          picked={shown.slug === current}
          onClose={() => setOpen(null)}
          onPick={disabled || shown.status !== "ready" ? undefined : () => (onPick(shown.slug), setOpen(null))}
          onDeleted={async () => {
            setOpen(null);
            const r = await myStyles();
            if (r.items) onMine(r.items);
          }}
        />
      )}
    </div>
  );
}

function MyStyleLightbox({ style: m, picked, onClose, onPick, onDeleted }: { style: MyStyleCard; picked: boolean; onClose: () => void; onPick?: () => void; onDeleted: () => void }) {
  const [sure, setSure] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const base = styleBySlug(m.basedOn);
  return (
    <div role="dialog" aria-modal aria-label={`Мой стиль ${m.name}`} onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-3xl space-y-4 overflow-y-auto rounded-3xl bg-[#14121f] p-4 text-white">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-semibold">{m.status === "failed" ? "Стиль не собрался" : m.name}</p>
            <p className="text-sm text-white/60">{m.status === "failed" ? m.error ?? "Попробуй другие ролики" : m.line}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть" className="min-h-11 min-w-11 rounded-full bg-white/10 text-lg hover:bg-white/20">
            ✕
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {m.frames.map((f) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={f} src={f} alt="" loading="lazy" className="h-40 shrink-0 rounded-xl object-cover" />
          ))}
        </div>
        {m.status === "ready" && (
          <>
            <div className="flex flex-wrap gap-2">
              {m.palette.map((c) => (
                <span key={c} className="flex items-center gap-1.5 rounded-full bg-white/10 py-1 pr-2.5 pl-1 text-[11px]">
                  <span className="size-4 rounded-full ring-1 ring-white/30" style={{ background: c }} /> {c}
                </span>
              ))}
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold tracking-wide text-white/50 uppercase">Что я увидел и сохранил</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-white/80">
                {m.seen.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            {base && <p className="text-xs text-white/50">Код ролика строится на технике «{base.name}», а выглядит по твоим кадрам.</p>}
          </>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {onPick && (
            <button type="button" onClick={onPick} className="min-h-11 rounded-2xl neo-primary px-5 text-sm font-semibold text-white">
              {picked ? "✓ Этот стиль выбран" : "Выбрать этот стиль"}
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              if (!sure) return setSure(true);
              setPending(true);
              const r = await removeMyStyle(m.slug);
              setPending(false);
              if (r.error) return toast(r.error, "error");
              toast("Стиль удалён");
              onDeleted();
            }}
            className="min-h-11 rounded-2xl bg-white/10 px-4 text-sm text-rose-200 hover:bg-white/20 disabled:opacity-50"
          >
            {sure ? "Точно удалить?" : "Удалить стиль"}
          </button>
        </div>
      </div>
    </div>
  );
}
