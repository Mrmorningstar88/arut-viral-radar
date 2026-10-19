"use client";

import { useRef, useTransition } from "react";
import { addCreator, addToQueue, processQueueNow } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const INPUT = "w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none transition placeholder:text-white/30 focus:border-amber-400/50";

export function AddReelForm({ compact = false }: { compact?: boolean }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const form = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={form}
      action={(fd) =>
        start(async () => {
          const r = await addToQueue(fd);
          if (r.error) return toast(r.error, "error");
          form.current?.reset();
          toast(r.started ? "Принял. Разбираю ролик, через пару минут он появится в «Роликах» 🚀" : "Добавил в очередь");
        })
      }
      className="space-y-2"
    >
      <input name="url" required type="url" placeholder="Ссылка на Reels: https://www.instagram.com/reel/…" className={INPUT} />
      {!compact && <input name="note" placeholder="Что хочешь взять из ролика (необязательно)" className={INPUT} />}
      <Button variant="primary" type="submit" disabled={pending}>{pending ? "Отправляю…" : "Разобрать ролик"}</Button>
    </form>
  );
}

export function AddCreatorForm() {
  const [pending, start] = useTransition();
  const toast = useToast();
  const form = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={form}
      action={(fd) =>
        start(async () => {
          const r = await addCreator(fd);
          if (r.error) return toast(r.error, "error");
          form.current?.reset();
          toast("Автор добавлен. Проверю его ролики в следующем прогоне");
        })
      }
      className="flex gap-2"
    >
      <input name="username" required placeholder="@ник или ссылка на профиль" className={INPUT} />
      <Button variant="primary" type="submit" disabled={pending} className="shrink-0">Добавить</Button>
    </form>
  );
}

export function RetryQueueButton() {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await processQueueNow();
          toast(r.error ?? "Разбираю. Обнови страницу через пару минут", r.error ? "error" : undefined);
        })
      }
    >
      Разобрать сейчас
    </Button>
  );
}
