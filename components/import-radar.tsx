"use client";

import { useState, useTransition } from "react";
import { importOldRadar } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

// Одна кнопка: база старого радара уже лежит в YOOMP, остаётся выбрать организацию и нажать.
export function ImportRadar({ org }: { org: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState<string | null>(null);
  const toast = useToast();
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        21 ролик с разборами и раскадровками, 18 сюжетов Red Pill, 23 автора для слежки и твой паспорт (факты, голос, табу). Всё ляжет в организацию «{org}». Повторное
        нажатие ничего не задвоит.
      </p>
      {done ? (
        <p className="text-sm text-emerald-300">{done}</p>
      ) : (
        <Button
          variant="primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await importOldRadar();
              if (r.error) return toast(r.error, "error");
              setDone(r.message ?? "Готово");
            })
          }
        >
          {pending ? "Переношу…" : "Перенести в эту организацию"}
        </Button>
      )}
    </div>
  );
}
