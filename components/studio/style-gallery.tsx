"use client";

import { useEffect, useState } from "react";
import {
  OPUS_FILM,
  OPUS_FRAME,
  OPUS_STYLES,
  styleBySlug,
} from "@/lib/studio/styles";

// У шаблона «my-style» фильма-примера нет.
// Галерея стилей lemo-opuscar по категориям: кадр, название, жанры и кнопка «Пример» с фильмом-образцом.
export function StyleGallery({
  current,
  onPick,
  disabled,
}: {
  current: string | null;
  onPick: (slug: string) => void;
  disabled?: boolean;
}) {
  const [film, setFilm] = useState<string | null>(null);
  const categories = [...new Set(OPUS_STYLES.map((s) => s.category))];
  return (
    <>
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
