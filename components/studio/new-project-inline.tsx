import Link from "next/link";

// Новая организация создаётся в мастере: название, ссылки, описание, о себе.
export function NewProjectInline() {
  return (
    <Link
      href="/welcome"
      className="shrink-0 rounded-full border border-dashed border-ink/15 px-4 py-1.5 text-sm text-muted transition hover:border-accent/50 hover:text-foreground"
    >
      + Организация
    </Link>
  );
}
