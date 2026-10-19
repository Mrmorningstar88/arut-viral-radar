import type { ReelAnalysis, RedPillStory, Shot } from "@/lib/generate/schema";

// Вымышленный разбор для демо-режима и тестов.
export const demoAnalysis = (hook: string, keyword: string): ReelAnalysis => {
  const ru = {
    original: {
      summary: "Автор задаёт зрителю вопрос про деньги, даёт секунду подумать и переворачивает ответ на бытовом примере (демо).",
      beats: [
        { t: "0-2", what: "Крупный план, вопрос в камеру и текст на экране" },
        { t: "2-10", what: "Бытовой пример: чек из кафе, рука с телефоном" },
        { t: "10-22", what: "Разворот: настоящий ответ с простой графикой" },
        { t: "22-28", what: "Призыв написать слово в комментариях" },
      ],
      mechanic: [
        { element: "Хук", theirs: "Вопрос, на который зритель уверен, что знает ответ", yours: "Вопрос про то, куда на самом деле уходят деньги при инфляции" },
        { element: "Структура", theirs: "Вопрос → бытовой пример → разворот", yours: "Вопрос → пример из трейдинга → как это устроено в макро" },
        { element: "Триггер", theirs: "«Я тоже так думал» и желание проверить себя", yours: "«Мне этого не говорили» и желание разобраться" },
        { element: "CTA", theirs: "Слово в комментариях за чек-лист", yours: "Слово в комментариях за разбор" },
      ],
    },
    why: [
      "Хук в первую секунду: вопрос, на который зритель уверен, что знает ответ, и ошибается.",
      "Один простой визуальный образ держит весь ролик, его можно пересказать другу.",
      "Финал переворачивает начало, поэтому ролик пересматривают и сохраняют.",
    ],
    adaptation: {
      concept: "Ты разбираешь привычку, которая тихо съедает деньги, на примере из жизни трейдера.",
      format: "Говорящая голова + 3 вставки с графикой, вертикаль 9:16",
      hook,
      vo: [
        { t: "0-3", text: hook },
        { t: "3-12", text: "Большинство думает, что проблема в доходе. Нет. Проблема в том, куда уходит первая же сотня." },
        { t: "12-24", text: "Я это понял на рынке: [реальный факт]. С тех пор у меня одно правило." },
        { t: "24-30", text: "Напиши слово в комментах, пришлю чек-лист. Это не финансовый совет." },
      ],
      storyboard: <Shot[]>[
        { n: 1, dur: 3, frame: "Крупный план, ты смотришь в камеру", overlay: hook, prompt: "[ARUT character reference] close-up, looking into camera, Dubai rooftop at dusk, cinematic, 9:16", scene: { location: "rooftop", shot: "close", camera: "push_in", action: "talk", props: [] } },
        { n: 2, dur: 9, frame: "Руки, телефон с банковским приложением", overlay: "Куда уходит первая сотня?", prompt: "[ARUT character reference] hands holding phone, generic banking app UI without logos, shallow depth of field, 9:16", scene: { location: "home", shot: "medium", camera: "orbit", action: "hold_phone", props: ["phone", "table"] } },
        { n: 3, dur: 12, frame: "Ты за трейдинг-столом, мониторы", overlay: "Одно правило", prompt: "[ARUT character reference] at trading desk with multiple monitors showing abstract charts, moody lighting, 9:16", scene: { location: "office", shot: "wide", camera: "pan", action: "sit", props: ["desk", "monitors", "chair"] } },
        { n: 4, dur: 6, frame: "Средний план, жест в камеру", overlay: `Пиши «${keyword}»`, prompt: "[ARUT character reference] medium shot, pointing at camera, confident, clean background, 9:16", scene: { location: "studio", shot: "medium", camera: "pull_out", action: "point", props: [] } },
      ],
      caption: "Не доход решает, а первая сотня. Пиши слово в комментах. Не финансовый совет.",
      keyword,
      cta: `Напиши «${keyword}» в комментариях`,
    },
    expert: { markets: "Не требуется.", macro: "Не требуется.", politics: "Не требуется." },
    risks: ["Не обещать результат в деньгах", "Проверить, что в кадре нет чужих логотипов"],
    note: "Видео целиком не просмотрено: разбор по подписи, метрикам и комментариям.",
  };
  const en = structuredClone({ ...ru, adaptation: { ...ru.adaptation, keyword: "RULE" } });
  return structuredClone({ ...ru, i18n: { ru, en } });
};


// Вымышленный сюжет Red Pill для демо: факты и источники здесь не настоящие.
export const demoRedpill = (): RedPillStory => {
  const base = demoAnalysis("В 1985 году пять стран за один день договорились обесценить доллар. Ты об этом слышал?", "ДОЛЛАР");
  const ru = {
    title: "Соглашение Плаза (демо)",
    era: "22 сентября 1985, отель Plaza, Нью-Йорк",
    distraction: "Новости о холодной войне и спорте, пока министры финансов G5 решали судьбу курсов валют (демо)",
    facts: [
      "Министры финансов пяти стран договорились о совместных интервенциях против доллара (демо).",
      "За следующие два года доллар заметно подешевел к иене и марке (демо).",
      "Последствия для Японии обсуждают до сих пор: от пузыря активов до потерянного десятилетия (демо).",
    ],
    adaptation: { ...base.adaptation, hook: "В 1985 году пять стран за один день договорились обесценить доллар. Ты об этом слышал?", keyword: "ДОЛЛАР" },
    expert: {
      markets: "Пример того, как скоординированные интервенции двигают валютные пары годами (демо).",
      macro: "Торговый дефицит США как причина договорённости (демо).",
      politics: "Не требуется.",
    },
    risks: ["Не выдавать гипотезы о последствиях за доказанные факты", "Это не финансовый совет"],
  };
  const en = structuredClone({ ...ru, title: "The Plaza Accord (demo)", adaptation: { ...ru.adaptation, keyword: "DOLLAR" } });
  return structuredClone({
    ...ru,
    sources: [
      { title: "Демо-источник: официальное заявление G5", url: "https://example.com/demo-official", kind: "official" as const },
      { title: "Демо-источник: научная статья", url: "https://example.com/demo-paper", kind: "peer_reviewed" as const },
    ],
    i18n: { ru, en },
  });
};
