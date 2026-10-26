// Форматы коротких роликов и рейтинг «какой формат залетает сильнее».
// Отрыв формата считается по медиане, а не по среднему: один мега-залёт не должен делать формат «лучшим».

export const FORMATS = [
  { id: "talking_head", label: "Говорящая голова", hint: "Человек в кадре прямо говорит мысль в камеру" },
  { id: "story", label: "История", hint: "Личная или чужая история с поворотом" },
  { id: "list", label: "Список", hint: "Топ-N, «3 вещи, которые…»" },
  { id: "myth", label: "Миф и правда", hint: "Разрушение распространённого убеждения" },
  { id: "explainer", label: "Объяснение на графике", hint: "Разбор на экране: график, схема, цифры" },
  { id: "pov", label: "Сценка / POV", hint: "Разыгранная ситуация, роли, POV" },
  { id: "before_after", label: "До и после", hint: "Контраст двух состояний" },
  { id: "challenge", label: "Вызов зрителю", hint: "Спор, вопрос, «спорим, ты не знаешь»" },
  { id: "news", label: "Разбор новости", hint: "Свежее событие и что оно значит" },
  { id: "day", label: "День из жизни", hint: "Влог, рутина, закулисье" },
  { id: "tutorial", label: "Инструкция", hint: "Пошаговый лайфхак или «как сделать»" },
  { id: "reaction", label: "Реакция", hint: "Реакция или дуэт на чужой ролик" },
  { id: "other", label: "Другое", hint: "Не подходит ни под один формат" },
] as const;

export type FormatId = (typeof FORMATS)[number]["id"];
export const FORMAT_IDS = FORMATS.map((f) => f.id) as [FormatId, ...FormatId[]];
export const formatLabel = (id: string) => FORMATS.find((f) => f.id === id)?.label ?? "Другое";

// Меньше стольких роликов: отрыв считается, но помечается «мало данных».
export const MIN_SAMPLE = 5;

export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export type FormatRank = { id: FormatId; label: string; count: number; medianViews: number; multiple: number; enough: boolean };

// Рейтинг: формат с достаточной выборкой всегда выше формата «мало данных», внутри групп по отрыву.
export function rankFormats(rows: { format: FormatId; views: number | null }[]): { overallMedian: number; ranks: FormatRank[] } {
  const withViews = rows.filter((r): r is { format: FormatId; views: number } => r.views != null && r.views > 0);
  const overallMedian = median(withViews.map((r) => r.views));
  const ranks = FORMATS.map((f) => {
    const views = withViews.filter((r) => r.format === f.id).map((r) => r.views);
    const m = median(views);
    return { id: f.id, label: f.label, count: views.length, medianViews: m, multiple: overallMedian > 0 ? m / overallMedian : 0, enough: views.length >= MIN_SAMPLE };
  })
    .filter((r) => r.count > 0)
    .sort((a, b) => Number(b.enough) - Number(a.enough) || b.multiple - a.multiple);
  return { overallMedian, ranks };
}

export const fmtMultiple = (x: number) => `×${x >= 10 ? Math.round(x) : x.toFixed(1).replace(".", ",")}`;
