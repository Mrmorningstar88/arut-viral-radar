"use client";

import { useRef, useTransition } from "react";
import { createProject } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const INPUT = "w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none transition placeholder:text-white/30 focus:border-amber-400/50";

export function NewProjectForm() {
  const [pending, start] = useTransition();
  const toast = useToast();
  const form = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={form}
      action={(fd) =>
        start(async () => {
          const r = await createProject(fd);
          if (r.error) return toast(r.error, "error");
          form.current?.reset();
          toast("Проект готов и уже открыт. Ниже его паспорт 🚀");
        })
      }
      className="space-y-2"
    >
      <input name="url" required type="url" placeholder="Ссылка на продукт: https://…" className={INPUT} disabled={pending} />
      <input name="note" placeholder="Что важно знать о продукте (необязательно)" className={INPUT} disabled={pending} />
      <Button variant="primary" type="submit" disabled={pending}>
        {pending ? "Читаю сайт и собираю паспорт, около минуты…" : "Создать проект"}
      </Button>
    </form>
  );
}
