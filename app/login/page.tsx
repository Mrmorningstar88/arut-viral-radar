"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { sendMagicLink, signIn, signUp } from "./actions";

const INPUT = "w-full rounded-2xl border border-ink/10 bg-paper/30 px-4 py-3 outline-none transition placeholder:text-ink/30 focus:border-accent/60";
const LINK = "min-h-11 w-full text-center text-sm text-muted transition hover:text-foreground";

type Mode = "signup" | "signin" | "link";

const TITLES: Record<Mode, [string, string]> = {
  signup: ["Создай аккаунт", "Бесплатно, без карты. Первые сценарии через пару минут."],
  signin: ["С возвращением", "Войди, чтобы продолжить работу"],
  link: ["Вход без пароля", "Пришлём ссылку на почту. После входа сможешь задать новый пароль."],
};

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

function Login() {
  const params = useSearchParams();
  const initial = params.get("mode");
  const [mode, setMode] = useState<Mode>(initial === "signup" || initial === "link" ? initial : "signin");
  const [email, setEmail] = useState("");
  const [title, subtitle] = TITLES[mode];

  return (
    <div className="mx-auto mt-10 max-w-sm space-y-6 md:mt-20">
      <div className="text-center">
        <Link href="/" className="font-display text-sm font-semibold tracking-wide text-muted hover:text-foreground">
          YOOMP
        </Link>
        <h1 className="mt-3 font-display text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>

      {mode !== "link" && (
        <div className="grid grid-cols-2 gap-1 rounded-full glass p-1 text-sm">
          {(["signup", "signin"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`min-h-11 rounded-full py-2 transition ${mode === m ? "neo-on" : "text-muted hover:text-foreground"}`}
            >
              {m === "signup" ? "Регистрация" : "Вход"}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
          {mode === "link" ? (
            <LinkStep email={email} setEmail={setEmail} back={() => setMode("signin")} />
          ) : (
            <PasswordStep signup={mode === "signup"} email={email} setEmail={setEmail} forgot={() => setMode("link")} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PasswordStep({ signup, email, setEmail, forgot }: { signup: boolean; email: string; setEmail: (v: string) => void; forgot: () => void }) {
  const [upState, upAction, upPending] = useActionState(signUp, null);
  const [inState, inAction, inPending] = useActionState(signIn, null);
  const state = signup ? upState : inState;
  const pending = upPending || inPending;

  return (
    <form action={signup ? upAction : inAction} className="space-y-3 rounded-3xl glass p-5">
      <input name="email" type="email" required autoComplete="email" placeholder="Почта" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
      <PasswordInput
        name="password"
        required
        minLength={signup ? 8 : undefined}
        autoComplete={signup ? "new-password" : "current-password"}
        placeholder={signup ? "Придумай пароль (от 8 символов)" : "Пароль"}
        className={INPUT}
      />
      <Button variant="primary" type="submit" disabled={pending} className="w-full justify-center py-3">
        {signup ? (pending ? "Создаю аккаунт…" : "Начать бесплатно") : pending ? "Вхожу…" : "Войти"}
      </Button>
      {state?.error && (
        <p role="alert" className="text-center text-sm text-rose-300">
          {state.error}
        </p>
      )}
      {!signup && (
        <button type="button" onClick={forgot} className={LINK}>
          Забыл пароль?
        </button>
      )}
    </form>
  );
}

// Шаг «вход по ссылке». Повторная отправка пересоздаёт форму, чтобы сбросить её состояние.
function LinkStep({ email, setEmail, back }: { email: string; setEmail: (v: string) => void; back: () => void }) {
  const [attempt, setAttempt] = useState(0);
  return <LinkForm key={attempt} email={email} setEmail={setEmail} back={back} again={() => setAttempt((n) => n + 1)} />;
}

function LinkForm({ email, setEmail, back, again }: { email: string; setEmail: (v: string) => void; back: () => void; again: () => void }) {
  const [state, action, pending] = useActionState(sendMagicLink, null);

  if (state?.sent)
    return (
      <div className="space-y-3 rounded-3xl glass p-6 text-center">
        <p className="text-4xl" aria-hidden>
          ✉️
        </p>
        <p className="font-display text-lg font-semibold">Проверь почту</p>
        <p className="text-sm text-muted">
          Мы отправили ссылку для входа на <b className="text-foreground">{email}</b>. Открой письмо и нажми ссылку в нём. Она работает один раз.
        </p>
        <p className="text-xs text-muted">Письма нет пару минут? Загляни в «Спам» или отправь ещё раз.</p>
        <button type="button" onClick={again} className="min-h-11 text-sm text-accent hover:underline">
          Отправить ещё раз
        </button>
        <button type="button" onClick={back} className={LINK}>
          ← Войти с паролем
        </button>
      </div>
    );

  return (
    <form action={action} className="space-y-3 rounded-3xl glass p-5">
      <input name="email" type="email" required autoFocus autoComplete="email" placeholder="Почта" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
      <Button variant="primary" type="submit" disabled={pending} className="w-full justify-center py-3">
        {pending ? "Отправляю…" : "Прислать ссылку"}
      </Button>
      {state?.error && (
        <p role="alert" className="text-center text-sm text-rose-300">
          {state.error}
        </p>
      )}
      <button type="button" onClick={back} className={LINK}>
        ← Войти с паролем
      </button>
    </form>
  );
}
