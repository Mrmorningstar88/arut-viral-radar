import type { ReelAnalysis, Shot } from "@/lib/generate/schema";

// Вымышленный разбор для демо-режима и тестов.
export const demoAnalysis = (hook: string, keyword: string): ReelAnalysis => {
  const ru = {
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

