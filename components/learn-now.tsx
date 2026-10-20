"use client";

import { useTransition } from "react";
import { learnNow } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function LearnNowButton() {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <Button
      variant="primary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await learnNow();
          toast(r.error ?? r.message ?? "Готово", r.error ? "error" : undefined);
        })
      }
    >
      {pending ? "Анализирую… до минуты" : "🧠 Обновить сейчас"}
    </Button>
  );
}
