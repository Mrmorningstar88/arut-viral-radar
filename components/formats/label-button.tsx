"use client";

import { useState, useTransition } from "react";
import { labelFormats } from "@/app/formats/actions";
import { AutoRefresh } from "@/components/studio/auto-refresh";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

// Запускает разметку и обновляет страницу, пока метки не появятся (не дольше двух минут).
export function LabelButton({ count }: { count: number }) {
  const [pending, start] = useTransition();
  const [running, setRunning] = useState(false);
  const toast = useToast();
  return (
    <>
      <AutoRefresh active={running && count > 0} every={5000} forMs={120_000} />
      <Button
        variant="primary"
        disabled={pending || running}
        onClick={() =>
          start(async () => {
            const r = await labelFormats();
            if (r.error) return toast(r.error, "error");
            setRunning(true);
            toast("Определяю форматы, рейтинг обновится сам");
          })
        }
      >
        {running ? "Определяю форматы…" : `Определить форматы (${count})`}
      </Button>
    </>
  );
}
