"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Пока Claude работает над карточками, страница сама подтягивает свежие данные.
export function AutoRefresh({ active, every = 6000, forMs = 180_000 }: { active: boolean; every?: number; forMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    const t = setInterval(() => {
      if (Date.now() - started > forMs) return clearInterval(t);
      router.refresh();
    }, every);
    return () => clearInterval(t);
  }, [active, every, forMs, router]);
  return null;
}
