"use client";

import { useEffect, useState } from "react";

// Состояние, которое помнится в этом браузере. Если хранилище недоступно, просто живёт в памяти.
export function useStored<T>(
  key: string,
  initial: T,
  parse: (raw: unknown) => T = (x) => x as T,
) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- читаем сохранённое только после гидратации
      if (raw) setValue(parse(JSON.parse(raw)));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {}
  };
  return [value, set] as const;
}

export function readStored(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}
