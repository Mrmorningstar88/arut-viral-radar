import type { ReelAnalysis } from "@/lib/generate/schema";
import { demoAnalysis, demoRedpill } from "./demo-analysis";
import { toSummary } from "./summary";
import type { Creator, LearnedRule, Persona, QueueItem, RedPill, Reel, Repo, Run, StatusChange } from "./types";

// Демо-режим без ключей: данные вымышленные и живут до перезапуска сервера.

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

const reels: Reel[] = [
  { id: "d1", platform: "instagram", url: "https://www.instagram.com/reel/DEMO1/", author: "example_finance", views: 14_200_000, likes: 910_000, comments: 12_400, postedAt: hoursAgo(30), caption: "Ты точно знаешь, куда уходят деньги? (демо)", lanes: ["viral"], fitScore: 88, fitReason: "Деньги и привычки: прямо в твою тему, формат говорящей головы.", status: "new", notes: "", publishedUrl: null, coverUrl: null },
  { id: "d2", platform: "instagram", url: "https://www.instagram.com/reel/DEMO2/", author: "example_mindset", views: 4_100_000, likes: 380_000, comments: 5_100, postedAt: hoursAgo(50), caption: "3 вещи, которые богатые не покупают (демо)", lanes: ["rising"], fitScore: 74, fitReason: "Растёт быстро, формат списка легко адаптировать.", status: "new", notes: "", publishedUrl: null, coverUrl: null },
  { id: "d3", platform: "instagram", url: "https://www.instagram.com/reel/DEMO3/", author: "example_travel", views: 22_000_000, likes: 1_500_000, comments: 30_000, postedAt: hoursAgo(400), caption: "Дубай за 1 день (демо)", lanes: ["viral"], fitScore: 52, fitReason: "Локация твоя, но тема туристическая.", status: "in_work", notes: "Снять на крыше", publishedUrl: null, coverUrl: null },
];

const analyses: Record<string, ReelAnalysis> = {
  d1: demoAnalysis("Спорим, ты не знаешь, куда ушли твои первые 100 долларов?", "СОТНЯ"),
  d2: demoAnalysis("Эти три вещи я перестал покупать, когда начал зарабатывать.", "ТРИ"),
  d3: demoAnalysis("Один день в Дубае, который стоит дороже, чем кажется.", "ДУБАЙ"),
};

const plaza = demoRedpill();
const redpills: RedPill[] = [
  { id: "p1", topic: "Plaza Accord 1985", title: plaza.title, era: plaza.era, distraction: plaza.distraction, status: "new", publishedUrl: null, createdAt: hoursAgo(3) },
];

const queue: QueueItem[] = [];
let persona: Persona = { name: "Арут", topics: "Экономика, деньги, макро, трейдинг, политика и правда, о которой не говорят (демо)", facts: "", voice: "", taboo: "", queries: ["деньги привычки", "трейдинг мотивация", "Дубай жизнь"] };
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
    return reels.filter((r) => !status || r.status === status).map((r) => ({ ...r, summary: analyses[r.id] ? toSummary(analyses[r.id]) : null }));
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
  async listRedpill() {
    return redpills;
  },
  async getRedpill(id) {
    const r = redpills.find((x) => x.id === id);
    return r ? { ...r, story: id === "p1" ? plaza : null } : null;
  },
  async setRedpillStatus(id, change) {
    const r = redpills.find((x) => x.id === id);
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
  async addCreator(username) {
    if (!creators.some((c) => c.username === username)) {
      creators.push({ username, followers: null, medianViews: null, source: "manual", lastCheckedAt: null });
    }
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
