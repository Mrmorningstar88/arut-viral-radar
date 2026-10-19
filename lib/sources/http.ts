// Общий fetch с таймаутом и ретраями: внешние API (Apify, Exa) иногда отвечают 429/5xx.

export class SourceError extends Error {
  constructor(message: string, readonly ru: string) {
    super(message);
  }
}

export async function fetchJson<T>(
  url: string,
  init: RequestInit & { timeoutMs?: number; retries?: number } = {},
): Promise<T> {
  const { timeoutMs = 120_000, retries = 2, ...rest } = init;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) return (await res.json()) as T;
      const body = await res.text();
      if (res.status !== 429 && res.status < 500) {
        throw new SourceError(`${res.status} ${body.slice(0, 300)}`, `Источник ответил ошибкой ${res.status}`);
      }
      lastError = new SourceError(`${res.status} ${body.slice(0, 300)}`, `Источник временно недоступен (${res.status})`);
    } catch (e) {
      if (e instanceof SourceError && !e.ru.includes("временно")) throw e;
      lastError = e;
    }
    await new Promise((r) => setTimeout(r, 2 ** attempt * 2000));
  }
  if (lastError instanceof SourceError) throw lastError;
  throw new SourceError(String(lastError), "Источник не ответил вовремя");
}
