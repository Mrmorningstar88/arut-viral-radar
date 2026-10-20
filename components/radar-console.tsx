"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { ReelCatalog } from "@/components/reel-catalog";
import { RUN_OPTIONS_KEY, RunNowButton } from "@/components/run-now";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Pills, Switch } from "@/components/ui/switch";
import type { ReelCard } from "@/lib/db/types";
import {
  DEFAULT_RUN_OPTIONS,
  DEPTH,
  parseRunOptions,
  type Depth,
} from "@/lib/engine/run-options";
import { compact } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { useStored } from "@/lib/use-stored";

type Sort = "views" | "fit" | "fresh";
type View = {
  viral: boolean;
  rising: boolean;
  trending: boolean;
  queue: boolean;
  minViews: number;
  ownTopic: boolean;
  sort: Sort;
};

const DEFAULT_VIEW: View = {
  viral: true,
  rising: true,
  trending: true,
  queue: true,
  minViews: 0,
  ownTopic: false,
  sort: "views",
};
const STEPS = [0, 1e6, 3e6, 5e6, 10e6, 20e6, 50e6];
const OWN_TOPIC_MIN = 70;

const parseView = (raw: unknown): View => ({
  ...DEFAULT_VIEW,
  ...(raw && typeof raw === "object" ? raw : {}),
});

// Пульт над каталогом: слева что показывать (мгновенно), справа как искать новый топ.
export function RadarConsole({ reels }: { reels: ReelCard[] }) {
  const [view, setView] = useStored<View>(
    "radar.view",
    DEFAULT_VIEW,
    parseView,
  );
  const [run, setRun] = useStored(
    RUN_OPTIONS_KEY,
    DEFAULT_RUN_OPTIONS,
    parseRunOptions,
  );
  const toast = useToast();
  const [open, setOpen] = useStored("radar.console-open", false);
  const patch = (p: Partial<View>) => setView({ ...view, ...p });
  // Последний источник выключить нельзя: иначе поиск пойдёт вхолостую.
  const patchRun = (p: Partial<typeof run>) => {
    const next = { ...run, ...p };
    if (!next.hashtags && !next.creators && !next.search)
      return toast("Хотя бы один источник должен быть включён", "error");
    setRun(parseRunOptions(next));
  };

  const shown = useMemo(() => {
    const lanesOn = (r: ReelCard) => {
      const lanes = r.lanes.length > 0 ? r.lanes : ["queue"];
      return lanes.some(
        (l) =>
          view[
            l as keyof Pick<View, "viral" | "rising" | "trending" | "queue">
          ],
      );
    };
    const key: Record<Sort, (r: ReelCard) => number> = {
      views: (r) => r.views ?? 0,
      fit: (r) => r.fitScore ?? 0,
      fresh: (r) => (r.postedAt ? Date.parse(r.postedAt) : 0),
    };
    return reels
      .filter(
        (r) =>
          lanesOn(r) &&
          (r.views ?? 0) >= view.minViews &&
          (!view.ownTopic || (r.fitScore ?? 0) >= OWN_TOPIC_MIN),
      )
      .sort((a, b) => key[view.sort](b) - key[view.sort](a));
  }, [reels, view]);

  const totalViews = shown.reduce((s, r) => s + (r.views ?? 0), 0);
  const lang = run.ru && run.en ? "both" : run.ru ? "ru" : "en";
  const stepIdx = Math.max(0, STEPS.indexOf(view.minViews));

  return (
    <div className="space-y-5">
      <section className="glass-strong overflow-hidden rounded-3xl">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2.5"
          >
            <span className="relative grid size-2.5 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#ff7a2f]/50 [animation-duration:2.4s]" />
              <span className="size-2.5 rounded-full bg-[#ff7a2f] shadow-[0_0_12px_rgba(255,122,47,0.9)]" />
            </span>
            <span className="font-display text-sm font-semibold tracking-wide">
              Пульт
            </span>
          </button>
          <Stat label="на экране">
            <AnimatedNumber value={shown.length} />
          </Stat>
          <Stat label="просмотров">
            <AnimatedNumber
              value={totalViews}
              format={(n) => compact(Math.round(n))}
            />
          </Stat>
          <Stat label="в работе">
            <AnimatedNumber
              value={shown.filter((r) => r.status === "in_work").length}
            />
          </Stat>
          <div className="ml-auto flex items-center gap-2">
            {!open && <RunNowButton />}
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="flex items-center gap-2 rounded-full bg-white/[0.06] px-3.5 py-2 text-xs font-medium text-muted ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.1] hover:text-foreground"
              aria-expanded={open}
            >
              {open ? "Свернуть" : "Тумблеры"}
              <motion.span animate={{ rotate: open ? 180 : 0 }}>▾</motion.span>
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="grid gap-4 border-t border-white/[0.06] p-4 md:grid-cols-2 md:p-5">
                <Group title="Что показывать">
                  <Switch
                    label="🔥 Вирусные"
                    hint="10M+ за 90 дней"
                    checked={view.viral}
                    onChange={(v) => patch({ viral: v })}
                  />
                  <Switch
                    label="📈 Растущие"
                    hint="3M+ за неделю"
                    checked={view.rising}
                    onChange={(v) => patch({ rising: v })}
                  />
                  <Switch
                    label="⚡ В тренде"
                    hint="1M+ за месяц, добор когда залётов мало"
                    checked={view.trending}
                    onChange={(v) => patch({ trending: v })}
                  />
                  <Switch
                    label="✋ Мои ссылки"
                    checked={view.queue}
                    onChange={(v) => patch({ queue: v })}
                  />
                  <Switch
                    label="🎯 Только в мою тему"
                    hint={`попадание ${OWN_TOPIC_MIN}+`}
                    checked={view.ownTopic}
                    onChange={(v) => patch({ ownTopic: v })}
                  />
                  <div className="space-y-2 px-3 pt-2">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted">Просмотров от</span>
                      <span className="font-semibold tabular-nums">
                        {view.minViews ? compact(view.minViews) : "любых"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={STEPS.length - 1}
                      value={stepIdx}
                      onChange={(e) =>
                        patch({ minViews: STEPS[Number(e.target.value)] })
                      }
                      className="range w-full"
                      style={
                        {
                          "--fill": `${(stepIdx / (STEPS.length - 1)) * 100}%`,
                        } as React.CSSProperties
                      }
                      aria-label="Минимум просмотров"
                    />
                  </div>
                  <div className="px-3 pt-3">
                    <Pills
                      id="sort"
                      value={view.sort}
                      onChange={(sort) => patch({ sort })}
                      options={[
                        { value: "views", label: "По просмотрам" },
                        { value: "fit", label: "По попаданию" },
                        { value: "fresh", label: "Свежие" },
                      ]}
                    />
                  </div>
                </Group>

                <Group title="Подтянуть топ">
                  <Switch
                    label="Хэштеги по твоим темам"
                    hint="деньги, макро, трейдинг и твои запросы"
                    checked={run.hashtags}
                    onChange={(v) => patchRun({ hashtags: v })}
                  />
                  <Switch
                    label="Любимые авторы"
                    hint="кого добавил и кто уже залетал"
                    checked={run.creators}
                    onChange={(v) => patchRun({ creators: v })}
                  />
                  <Switch
                    label="Поиск по запросам"
                    hint="из «Твоего образа»"
                    checked={run.search}
                    onChange={(v) => patchRun({ search: v })}
                  />
                  <Switch
                    label="Только настоящие залёты"
                    hint="без добора из трендов"
                    checked={run.strictOnly}
                    onChange={(v) => patchRun({ strictOnly: v })}
                  />
                  <div className="grid gap-3 px-3 pt-2 sm:grid-cols-2">
                    <Field label="Язык">
                      <Pills
                        id="lang"
                        value={lang}
                        onChange={(l) =>
                          patchRun({ ru: l !== "en", en: l !== "ru" })
                        }
                        options={[
                          { value: "both", label: "Все" },
                          { value: "ru", label: "RU" },
                          { value: "en", label: "EN" },
                        ]}
                      />
                    </Field>
                    <Field label="Глубина">
                      <Pills
                        id="depth"
                        value={run.depth}
                        onChange={(depth: Depth) => patchRun({ depth })}
                        options={(Object.keys(DEPTH) as Depth[]).map((d) => ({
                          value: d,
                          label: DEPTH[d].label,
                        }))}
                      />
                    </Field>
                  </div>
                  <div className="px-3 pt-4">
                    <RunNowButton
                      wide
                      label={`Подтянуть топ · до ${DEPTH[run.depth].take} новых`}
                    />
                    <p className="mt-2 text-center text-xs text-white/35">
                      Плановые поиски в 09:00 и 20:00 идут со стандартными
                      настройками
                    </p>
                  </div>
                </Group>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {shown.length > 0 ? (
        <ReelCatalog reels={shown} />
      ) : (
        <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center text-sm text-muted">
          Тумблеры скрыли {reels.length} {plural(reels.length)}.{" "}
          <button
            type="button"
            onClick={() => setView(DEFAULT_VIEW)}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Показать всё
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-display text-base font-semibold">{children}</span>
      <span className="text-xs text-muted">{label}</span>
    </span>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-inset rounded-2xl p-2 pb-4">
      <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-widest text-muted uppercase">
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted">{label}</p>
      {children}
    </div>
  );
}

function plural(n: number) {
  const d = n % 10;
  const h = n % 100;
  if (d === 1 && h !== 11) return "ролик";
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return "ролика";
  return "роликов";
}
