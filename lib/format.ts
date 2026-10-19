export function compact(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function dubaiDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Dubai", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
