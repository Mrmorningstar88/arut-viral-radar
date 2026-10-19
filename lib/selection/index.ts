export const VIRAL_MIN_VIEWS = 10_000_000;
export const VIRAL_MAX_AGE_DAYS = 90;
export const RISING_MIN_VIEWS = 3_000_000;
export const RISING_MAX_AGE_DAYS = 7;
export const MAX_NEW_PER_RUN = 4;

export type Candidate = {
  igId: string;
  views: number | null;
  postedAt: Date;
  authorFollowers: number | null;
};

export type Lane = "viral" | "rising";

const DAY = 24 * 60 * 60 * 1000;

export function lanesFor(c: Candidate, now = new Date()): Lane[] {
  if (c.views == null) return [];
  const age = (now.getTime() - c.postedAt.getTime()) / DAY;
  const lanes: Lane[] = [];
  if (c.views >= VIRAL_MIN_VIEWS && age <= VIRAL_MAX_AGE_DAYS) lanes.push("viral");
  if (c.views >= RISING_MIN_VIEWS && age <= RISING_MAX_AGE_DAYS) lanes.push("rising");
  return lanes;
}

// Свежесть важнее, при равенстве решает views/followers.
export function pickTop<T extends Candidate>(
  candidates: T[],
  existingIds: Set<string>,
  now = new Date(),
): T[] {
  return candidates
    .filter((c) => !existingIds.has(c.igId) && lanesFor(c, now).length > 0)
    .sort((a, b) => {
      const byDay = Math.floor(b.postedAt.getTime() / DAY) - Math.floor(a.postedAt.getTime() / DAY);
      if (byDay !== 0) return byDay;
      return ratio(b) - ratio(a);
    })
    .slice(0, MAX_NEW_PER_RUN);
}

function ratio(c: Candidate) {
  return c.authorFollowers ? (c.views ?? 0) / c.authorFollowers : 0;
}
