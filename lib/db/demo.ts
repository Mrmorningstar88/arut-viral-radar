import type { ReelAnalysis } from "@/lib/generate/schema";
import type { Creator, LearnedRule, Persona, QueueItem, Reel, Repo, Run, StatusChange } from "./types";

// Демо-режим без ключей: данные вымышленные и живут до перезапуска сервера.

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

const demoAnalysis = (hook: string, keyword: string): ReelAnalysis => {
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
      storyboard: [
        { n: 1, dur: 3, frame: "Крупный план, ты смотришь в камеру", overlay: hook, prompt: "[ARUT character reference] close-up, looking into camera, Dubai rooftop at dusk, cinematic, 9:16" },
        { n: 2, dur: 6, frame: "Руки, телефон с банковским приложением", overlay: "Куда уходит первая сотня?", prompt: "[ARUT character reference] hands holding phone, generic banking app UI without logos, shallow depth of field, 9:16" },
        { n: 3, dur: 9, frame: "Ты за трейдинг-столом, мониторы", overlay: "Одно правило", prompt: "[ARUT character reference] at trading desk with multiple monitors showing abstract charts, moody lighting, 9:16" },
        { n: 4, dur: 6, frame: "Средний план, жест в камеру", overlay: `Пиши «${keyword}»`, prompt: "[ARUT character reference] medium shot, pointing at camera, confident, clean background, 9:16" },
      ],
      caption: "Не доход решает, а первая сотня. Пиши слово в комментах. Не финансовый совет.",
      keyword,
      cta: `Напиши «${keyword}» в комментариях`,
    },
    expert: { markets: "Не требуется.", macro: "Не требуется.", politics: "Не требуется." },
    risks: ["Не обещать результат в деньгах", "Проверить, что в кадре нет чужих логотипов"],
    note: "Видео целиком не просмотрено: разбор по подписи, метрикам и комментариям.",
  };
  return { ...ru, i18n: { ru, en: { ...ru, adaptation: { ...ru.adaptation, keyword: "RULE" } } } };
};

const reels: Reel[] = [
  { id: "d1", platform: "instagram", url: "https://www.instagram.com/reel/DEMO1/", author: "example_finance", views: 14_200_000, likes: 910_000, comments: 12_400, postedAt: hoursAgo(30), caption: "Ты точно знаешь, куда уходят деньги? (демо)", lanes: ["viral"], fitScore: 88, fitReason: "Деньги и привычки: прямо в твою тему, формат говорящей головы.", status: "new", notes: "", publishedUrl: null },
  { id: "d2", platform: "instagram", url: "https://www.instagram.com/reel/DEMO2/", author: "example_mindset", views: 4_100_000, likes: 380_000, comments: 5_100, postedAt: hoursAgo(50), caption: "3 вещи, которые богатые не покупают (демо)", lanes: ["rising"], fitScore: 74, fitReason: "Растёт быстро, формат списка легко адаптировать.", status: "new", notes: "", publishedUrl: null },
  { id: "d3", platform: "instagram", url: "https://www.instagram.com/reel/DEMO3/", author: "example_travel", views: 22_000_000, likes: 1_500_000, comments: 30_000, postedAt: hoursAgo(400), caption: "Дубай за 1 день (демо)", lanes: ["viral"], fitScore: 52, fitReason: "Локация твоя, но тема туристическая.", status: "in_work", notes: "Снять на крыше", publishedUrl: null },
];

const analyses: Record<string, ReelAnalysis> = {
  d1: demoAnalysis("Спорим, ты не знаешь, куда ушли твои первые 100 долларов?", "СОТНЯ"),
  d2: demoAnalysis("Эти три вещи я перестал покупать, когда начал зарабатывать.", "ТРИ"),
  d3: demoAnalysis("Один день в Дубае, который стоит дороже, чем кажется.", "ДУБАЙ"),
};

const queue: QueueItem[] = [];
let persona: Persona = { name: "Арут", facts: "", voice: "", taboo: "" };
const creators: Creator[] = [
  { username: "example_finance", followers: 2_400_000, medianViews: 900_000, source: "auto", lastCheckedAt: hoursAgo(5) },
];
const runs: Run[] = [
  { id: "r1", kind: "morning", startedAt: hoursAgo(12), finishedAt: hoursAgo(11.9), stats: { found: 37, selected: 3 }, errors: [] },
];
const rules: LearnedRule[] = [
  { id: "l1", text: "Хуки-вопросы про деньги заходят лучше утверждений (демо)", status: "proposed" },
];

export const demoRepo: Repo = {
  demo: true,
  async listReels(status) {
    return reels.filter((r) => !status || r.status === status);
  },
  async getReel(id) {
    const r = reels.find((x) => x.id === id);
    return r ? { ...r, analysis: analyses[id] ?? null } : null;
  },
  async setReelStatus(id, change: StatusChange) {
    const r = reels.find((x) => x.id === id);
    if (!r) return;
    r.status = change.status;
    if (change.publishedUrl) r.publishedUrl = change.publishedUrl;
  },
  async listQueue() {
    return queue;
  },
  async addToQueue(url, note) {
    queue.unshift({ id: crypto.randomUUID(), url, note, status: "pending", errorRu: null, createdAt: new Date().toISOString() });
  },
  async getPersona() {
    return persona;
  },
  async savePersona(p) {
    persona = p;
  },
  async listCreators() {
    return creators;
  },
  async listRuns() {
    return runs;
  },
  async listRules() {
    return rules;
  },
  async setRuleStatus(id, status) {
    const r = rules.find((x) => x.id === id);
    if (r) r.status = status;
  },
};
