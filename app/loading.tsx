// Мгновенный отклик при переходе между разделами: каркас страницы, пока сервер собирает данные.
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Загружаю">
      <div className="h-11 w-56 animate-pulse rounded-full glass" />
      <div className="space-y-2">
        <div className="h-3 w-28 animate-pulse rounded-full bg-ink/[0.08]" />
        <div className="h-8 w-64 animate-pulse rounded-xl bg-ink/[0.08]" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded-full bg-ink/[0.06]" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-3xl glass" />
        ))}
      </div>
    </div>
  );
}
