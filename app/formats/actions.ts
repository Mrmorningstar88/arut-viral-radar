"use server";

import { after } from "next/server";
import { isDemo } from "@/lib/db";
import { formatBoard, classifyMissing } from "@/lib/formats/store";
import { currentWorkspace } from "@/lib/projects";

// Разметка форматов идёт в фоне: страница сама обновится, когда метки появятся.
export async function labelFormats(): Promise<{ error?: string }> {
  if (isDemo()) return { error: "В демо-режиме разметка недоступна" };
  try {
    const ws = await currentWorkspace(); // проверяет вход и доступ к организации
    const board = await formatBoard(ws);
    const target = board.shared ? process.env.WORKSPACE_ID! : ws;
    after(() => classifyMissing(target).catch((e) => console.error("classifyMissing", e)));
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message.slice(0, 200) : "ошибка" };
  }
}
