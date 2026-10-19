import type { ReelAnalysis } from "@/lib/generate/schema";

export const REEL_STATUSES = ["new", "in_work", "rejected", "filmed", "published"] as const;
export type ReelStatus = (typeof REEL_STATUSES)[number];

export const STATUS_LABEL: Record<ReelStatus, string> = {
  new: "Новый",
  in_work: "В работе",
  rejected: "Не подходит",
  filmed: "Снято",
  published: "Выложено",
};

export const REJECT_REASONS = {
  topic: "Не моя тема",
  format: "Формат не мой",
  delivery: "Подача не моя",
  trash: "Треш / низкое качество",
  repeat: "Уже было",
  other: "Другое",
} as const;
export type RejectReason = keyof typeof REJECT_REASONS;

export type Reel = {
  id: string;
  platform: "instagram" | "tiktok";
  url: string;
  author: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  postedAt: string | null;
  caption: string | null;
  lanes: string[];
  fitScore: number | null;
  fitReason: string | null;
  status: ReelStatus;
  notes: string;
  publishedUrl: string | null;
};

export type ReelWithAnalysis = Reel & { analysis: ReelAnalysis | null };

export type QueueItem = {
  id: string;
  url: string;
  note: string;
  status: "pending" | "done" | "error";
  errorRu: string | null;
  createdAt: string;
};

export type Persona = { name: string; facts: string; voice: string; taboo: string; queries: string[] };

export type Creator = {
  username: string;
  followers: number | null;
  medianViews: number | null;
  source: "auto" | "manual";
  lastCheckedAt: string | null;
};

export type Run = {
  id: string;
  kind: "morning" | "evening" | "manual";
  startedAt: string;
  finishedAt: string | null;
  stats: Record<string, number>;
  errors: string[];
};

export type LearnedRule = {
  id: string;
  text: string;
  status: "proposed" | "approved" | "rejected";
};

export type StatusChange = {
  status: ReelStatus;
  reason?: RejectReason;
  reasonText?: string;
  publishedUrl?: string;
};

export interface Repo {
  readonly demo: boolean;
  listReels(status?: ReelStatus): Promise<Reel[]>;
  getReel(id: string): Promise<ReelWithAnalysis | null>;
  setReelStatus(id: string, change: StatusChange): Promise<void>;
  listQueue(): Promise<QueueItem[]>;
  addToQueue(url: string, note: string): Promise<void>;
  getPersona(): Promise<Persona>;
  savePersona(p: Persona): Promise<void>;
  listCreators(): Promise<Creator[]>;
  addCreator(username: string): Promise<void>;
  listRuns(): Promise<Run[]>;
  listRules(): Promise<LearnedRule[]>;
  setRuleStatus(id: string, status: LearnedRule["status"]): Promise<void>;
}
