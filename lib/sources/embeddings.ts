import { fetchJson } from "./http";

// Voyage: эмбеддинги для проверки сюжетов Red Pill на дубли по смыслу.
export async function embed(text: string): Promise<number[] | null> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) return null;
  const res = await fetchJson<{ data: { embedding: number[] }[] }>("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ input: [text], model: "voyage-3.5-lite", output_dimension: 512 }),
    timeoutMs: 30_000,
  });
  return res.data[0]?.embedding ?? null;
}
