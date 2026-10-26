import type { Stage } from "@/lib/studio/schema";

// Постоянный цвет каждого этапа: точка в заголовке колонки, счётчик и полоска на карточке.
export const STAGE_TONE: Record<Stage, { dot: string; chip: string; bar: string }> = {
  script: { dot: "bg-st-script", chip: "bg-st-script/20 text-st-script-ink", bar: "before:bg-st-script" },
  storyboard: { dot: "bg-st-board", chip: "bg-st-board/20 text-st-board-ink", bar: "before:bg-st-board" },
  production: { dot: "bg-st-prod", chip: "bg-st-prod/20 text-st-prod-ink", bar: "before:bg-st-prod" },
  ready: { dot: "bg-st-ready", chip: "bg-st-ready/20 text-st-ready-ink", bar: "before:bg-st-ready" },
  published: { dot: "bg-st-pub", chip: "bg-st-pub/20 text-st-pub-ink", bar: "before:bg-st-pub" },
  rejected: { dot: "bg-ink/30", chip: "bg-ink/[0.06] text-muted", bar: "before:bg-ink/20" },
};
