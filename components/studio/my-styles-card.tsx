"use client";

import { useState } from "react";
import { MyStyles } from "@/components/studio/style-gallery";
import type { MyStyleCard } from "@/lib/studio/styles";

// Карточка «Мои стили» в Настройках: те же плитки и загрузка роликов, что в галерее стилей ролика.
export function MyStylesCard({ org, initial }: { org: string; initial: MyStyleCard[] }) {
  const [mine, setMine] = useState(initial);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Загрузи 1–5 своих роликов, и я сохраню их стиль для организации{org && <> <span className="font-medium text-foreground">{org}</span></>}. Потом выбираешь его в «Стиль и запуск» перед производством ролика.
      </p>
      <MyStyles mine={mine} onMine={setMine} title={false} />
    </div>
  );
}
