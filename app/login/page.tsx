"use client";

import { motion } from "motion/react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { sendMagicLink } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(sendMagicLink, null);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-24 max-w-sm space-y-6 text-center">
      <div className="mx-auto size-14 rounded-full bg-white shadow-[0_0_60px_rgba(255,255,255,0.35)]" />
      <h1 className="font-display text-2xl font-semibold">Вход в Viral Radar</h1>
      <form action={action} className="space-y-3">
        <input name="email" type="email" required placeholder="Твоя почта" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-amber-400/50" />
        <Button variant="primary" type="submit" disabled={pending} className="w-full justify-center">{pending ? "Отправляю…" : "Получить ссылку"}</Button>
      </form>
      {state && <p className={`text-sm ${state.sent ? "text-emerald-300" : "text-rose-300"}`}>{state.message}</p>}
    </motion.div>
  );
}
