"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { sendMagicLink, signIn, signUp } from "./actions";

const INPUT = "w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none transition placeholder:text-white/30 focus:border-[#ff7a2f]/60";

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

function Login() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"signup" | "signin">(params.get("mode") === "signup" ? "signup" : "signin");
  const [upState, upAction, upPending] = useActionState(signUp, null);
  const [inState, inAction, inPending] = useActionState(signIn, null);
  const [linkState, linkAction, linkPending] = useActionState(sendMagicLink, null);
  const signup = mode === "signup";
  const state = signup ? upState : inState;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-10 max-w-sm space-y-6 md:mt-20">
      <div className="text-center">
        <Link href="/" className="font-display text-sm font-semibold tracking-wide text-muted hover:text-foreground">
          YOOMP
        </Link>
        <h1 className="mt-3 font-display text-2xl font-semibold">{signup ? "Создай аккаунт" : "С возвращением"}</h1>
        <p className="mt-1 text-sm text-muted">{signup ? "Бесплатно, без карты. Первые сценарии через пару минут." : "Войди, чтобы продолжить работу"}</p>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-full glass p-1 text-sm">
        {(["signup", "signin"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full py-2 transition ${mode === m ? "bg-white text-black" : "text-muted hover:text-foreground"}`}
          >
            {m === "signup" ? "Регистрация" : "Вход"}
          </button>
        ))}
      </div>

      <form action={signup ? upAction : inAction} className="space-y-3 rounded-3xl glass p-5">
        <input name="email" type="email" required autoComplete="email" placeholder="Почта" className={INPUT} />
        <input
          name="password"
          type="password"
          required
          minLength={signup ? 8 : undefined}
          autoComplete={signup ? "new-password" : "current-password"}
          placeholder={signup ? "Придумай пароль (от 8 символов)" : "Пароль"}
          className={INPUT}
        />
        <Button variant="primary" type="submit" disabled={upPending || inPending} className="w-full justify-center py-3">
          {signup ? (upPending ? "Создаю аккаунт…" : "Начать бесплатно") : inPending ? "Вхожу…" : "Войти"}
        </Button>
        {state?.error && <p className="text-center text-sm text-rose-300">{state.error}</p>}
        {!signup && (
          <button formAction={linkAction} formNoValidate disabled={linkPending} className="w-full text-center text-xs text-muted hover:text-foreground">
            {linkPending ? "Отправляю…" : "Нет пароля? Войти по ссылке на почту"}
          </button>
        )}
        {!signup && linkState && (
          <p className={`text-center text-xs ${linkState.error ? "text-rose-300" : "text-emerald-300"}`}>{linkState.error ?? linkState.message}</p>
        )}
      </form>
    </motion.div>
  );
}
