"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  fmtMultiple,
  formatLabel,
  MIN_SAMPLE,
  type FormatId,
  type FormatRank,
} from "@/lib/formats/catalog";
import type { FormatReel } from "@/lib/formats/store";
import { compact } from "@/lib/format";

// Рейтинг форматов слева, карта залётов справа. Выбранный формат подсвечивается на карте,
// под картой его лучшие ролики. Цвет здесь один (фиолетовый из лого): он отмечает выбор, а не категорию.

const PAD = { l: 68, r: 16, t: 20, b: 40 };
const ACCENT = "#7048e8";
const MUTED = "#b9b3cf";

const log = (v: number) => Math.log10(Math.max(1, v));

// Деления 1, 3, 10, 30… внутри видимого диапазона: на узкой шкале одних степеней десяти мало.
function ticks(min: number, max: number) {
  const out: number[] = [];
  for (let p = Math.floor(min); p <= Math.ceil(max); p++)
    for (const m of [1, 3]) {
      const v = p + Math.log10(m);
      if (v >= min && v <= max) out.push(v);
    }
  return out;
}

export function FormatExplorer({
  ranks,
  reels,
}: {
  ranks: FormatRank[];
  reels: FormatReel[];
}) {
  const [selected, setSelected] = useState<FormatId | null>(
    ranks[0]?.id ?? null,
  );
  const [hover, setHover] = useState<FormatReel | null>(null);
  const points = useMemo(
    () => reels.filter((r) => r.format && r.views && r.likes),
    [reels],
  );
  // Ширина карты в реальных пикселях: подписи осей остаются читаемыми и на телефоне.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setW(Math.max(280, Math.round(e.contentRect.width))),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = W < 500 ? 300 : 400;

  const sx = useMemo(() => {
    const xs = points.map((p) => log(p.views!));
    const ys = points.map((p) => log(p.likes!));
    // Шкала по данным с запасом в треть порядка, чтобы точки не жались к краям.
    const x0 = Math.min(...xs) - 0.3;
    const x1 = Math.max(...xs) + 0.3;
    const y0 = Math.min(...ys) - 0.3;
    const y1 = Math.max(...ys) + 0.3;
    return {
      x0,
      x1,
      y0,
      y1,
      x: (v: number) =>
        PAD.l + ((log(v) - x0) / (x1 - x0)) * (W - PAD.l - PAD.r),
      y: (v: number) =>
        H - PAD.b - ((log(v) - y0) / (y1 - y0)) * (H - PAD.t - PAD.b),
    };
  }, [points, W, H]);

  const best = Math.max(...ranks.map((r) => r.multiple), 1);
  const picked = ranks.find((r) => r.id === selected);
  const top = reels.filter((r) => r.format === selected).slice(0, 6);
  // Выбранные точки рисуются последними, чтобы лежать поверх серых.
  const ordered = [...points].sort(
    (a, b) => Number(a.format === selected) - Number(b.format === selected),
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <section className="rounded-3xl glass p-4" aria-label="Рейтинг форматов">
        <div className="mb-3 flex items-baseline justify-between px-1">
          <h2 className="text-sm font-semibold">Какие форматы залетают</h2>
          <span className="text-xs text-muted">отрыв от медианы</span>
        </div>
        <ul className="space-y-1.5">
          {ranks.map((r) => {
            const on = r.id === selected;
            return (
              <li key={r.id}>
                <button
                  onClick={() => setSelected(r.id)}
                  aria-pressed={on}
                  className={`w-full rounded-2xl px-3 py-2.5 text-left ${on ? "glass-inset" : "hover:bg-ink/[0.03]"}`}
                >
                  <span className="flex items-center justify-between gap-3 text-sm">
                    <span className={`font-medium ${on ? "text-accent" : ""}`}>
                      {r.label}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {fmtMultiple(r.multiple)}
                    </span>
                  </span>
                  <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-ink/[0.06]">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.max(4, (r.multiple / best) * 100)}%`,
                        background: on ? ACCENT : "#9d8be8",
                      }}
                    />
                  </span>
                  <span className="mt-1 flex justify-between text-[11px] text-muted">
                    <span>
                      {r.count} {plural(r.count)} · медиана{" "}
                      {compact(r.medianViews)}
                    </span>
                    {!r.enough && (
                      <span className="font-medium text-st-script-ink">
                        ⚠ мало данных
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted">
          ×1 это типичный залёт в нише. Формат с меньше чем {MIN_SAMPLE}{" "}
          роликами показан ниже остальных: по нему рано делать выводы.
        </p>
      </section>

      <div className="space-y-4">
        <section
          className="relative rounded-3xl glass p-4"
          aria-label="Карта залётов"
        >
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 px-1">
            <h2 className="text-sm font-semibold">Карта залётов</h2>
            <span className="flex items-center gap-3 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: ACCENT }}
                />
                {picked?.label ?? "Формат"}
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: MUTED }}
                />
                остальные
              </span>
            </span>
          </div>
          <div ref={box}>
            {points.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted">
                Пока нет роликов с форматом.
              </p>
            ) : (
              <svg
                viewBox={`0 0 ${W} ${H}`}
                width={W}
                height={H}
                className="block max-w-full"
                role="img"
                aria-label="Просмотры и лайки каждого залёта, логарифмическая шкала"
              >
                {ticks(sx.x0, sx.x1).map((p) => (
                  <g key={`x${p}`}>
                    <line
                      x1={sx.x(10 ** p)}
                      x2={sx.x(10 ** p)}
                      y1={PAD.t}
                      y2={H - PAD.b}
                      stroke="#141a33"
                      strokeOpacity={0.07}
                    />
                    <text
                      x={sx.x(10 ** p)}
                      y={H - PAD.b + 18}
                      textAnchor="middle"
                      className="fill-muted text-[11px]"
                    >
                      {compact(10 ** p)}
                    </text>
                  </g>
                ))}
                {ticks(sx.y0, sx.y1).map((p) => (
                  <g key={`y${p}`}>
                    <line
                      x1={PAD.l}
                      x2={W - PAD.r}
                      y1={sx.y(10 ** p)}
                      y2={sx.y(10 ** p)}
                      stroke="#141a33"
                      strokeOpacity={0.07}
                    />
                    <text
                      x={PAD.l - 8}
                      y={sx.y(10 ** p) + 4}
                      textAnchor="end"
                      className="fill-muted text-[11px]"
                    >
                      {compact(10 ** p)}
                    </text>
                  </g>
                ))}
                <text
                  x={W - PAD.r}
                  y={H - 6}
                  textAnchor="end"
                  className="fill-muted text-[11px]"
                >
                  просмотры →
                </text>
                <text
                  x={PAD.l}
                  y={PAD.t - 4}
                  className="fill-muted text-[11px]"
                >
                  ↑ лайки
                </text>
                {ordered.map((p) => {
                  const on = p.format === selected;
                  return (
                    <g
                      key={p.id}
                      onMouseEnter={() => setHover(p)}
                      onMouseLeave={() => setHover(null)}
                      className="cursor-pointer"
                      onClick={() => setSelected(p.format)}
                    >
                      <circle
                        cx={sx.x(p.views!)}
                        cy={sx.y(p.likes!)}
                        r={14}
                        fill="transparent"
                      />
                      <circle
                        cx={sx.x(p.views!)}
                        cy={sx.y(p.likes!)}
                        r={on ? 6.5 : 5}
                        fill={on ? ACCENT : MUTED}
                        fillOpacity={on ? 1 : 0.7}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
          {hover && (
            <div
              className="pointer-events-none absolute z-10 w-60 rounded-2xl bg-paper px-3 py-2 text-xs shadow-lg ring-1 ring-ink/10"
              style={tipPosition(
                sx.x(hover.views!) / W,
                sx.y(hover.likes!) / H,
              )}
            >
              <p className="font-semibold">{hover.hook}</p>
              <p className="mt-1 text-muted">
                @{hover.author} · {formatLabel(hover.format ?? "other")}
              </p>
              <p className="mt-0.5 tabular-nums">
                {compact(hover.views)} просмотров · {compact(hover.likes)}{" "}
                лайков
              </p>
            </div>
          )}
        </section>

        {picked && (
          <section
            className="rounded-3xl glass p-4"
            aria-label="Лучшие ролики формата"
          >
            <h2 className="mb-3 px-1 text-sm font-semibold">
              Лучшие ролики формата «{picked.label}»
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {top.map((r) => {
                const body = (
                  <>
                    <span className="line-clamp-2 text-sm font-medium">
                      {r.hook}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      @{r.author} · {compact(r.views)} просмотров
                    </span>
                  </>
                );
                return (
                  <li key={r.id}>
                    {r.id.startsWith("demo-") ? (
                      <div className="h-full rounded-2xl neo-btn p-3">
                        {body}
                      </div>
                    ) : (
                      <Link
                        href={`/reels/${r.id}`}
                        className="block h-full rounded-2xl neo-btn p-3"
                      >
                        {body}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

// Подсказка не вылезает за карту: у правого края открывается влево, у верхнего вниз.
function tipPosition(fx: number, fy: number): React.CSSProperties {
  const tx = fx > 0.7 ? "-100%" : fx < 0.3 ? "0%" : "-50%";
  const ty = fy < 0.4 ? "12px" : "calc(-100% - 12px)";
  return {
    left: `${fx * 100}%`,
    top: `${fy * 100}%`,
    transform: `translate(${tx}, ${ty})`,
  };
}

const plural = (n: number) =>
  n % 10 === 1 && n % 100 !== 11
    ? "ролик"
    : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
      ? "ролика"
      : "роликов";
