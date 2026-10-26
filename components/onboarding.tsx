"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createProject } from "@/app/actions";
import { useToast } from "@/components/ui/toast";

const STAGES = [
  "Открываю сайт и читаю, что это за продукт",
  "Ищу, кто аудитория и что о продукте говорят",
  "Собираю образ проекта: боли, выгоды, тон",
  "Подбираю механики залетевших роликов",
];

const INPUT = "w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-base outline-none transition placeholder:text-white/30 focus:border-[#ff7a2f]/60";

export function Onboarding({ first }: { first: boolean }) {
  const [pending, start] = useTransition();
  const [stage, setStage] = useState(0);
  const router = useRouter();
  const toast = useToast();

  // Сборка образа идёт 1–2 минуты одним запросом; шаги показывают, что происходит.
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 22_000);
    return () => clearInterval(t);
  }, [pending]);

  return (
    <div className="mx-auto max-w-xl pt-6 md:pt-16">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <p className="text-xs font-semibold tracking-widest text-[#ff7a2f] uppercase">{first ? "Шаг 1 из 1" : "Новый проект"}</p>
        <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">{first ? "Что будем продвигать?" : "Добавим ещё один проект"}</h1>
        <p className="mt-3 text-muted">Вставь ссылку на продукт, сайт или аккаунт. Остальное YOOMP сделает сам: изучит продукт и предложит первые сценарии.</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {!pending ? (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            action={(fd) => {
              setStage(0);
              start(async () => {
                fd.set("start", "1");
                const r = await createProject(fd);
                if (r.error) return toast(r.error, "error");
                toast("Проект готов. Первые сценарии появятся на доске через минуту 🚀");
                router.push("/");
              });
            }}
            className="mt-8 space-y-3 rounded-[28px] glass p-5"
          >
            <input name="url" type="url" required autoFocus placeholder="https://твой-продукт.com" className={INPUT} />
            <textarea name="note" rows={2} placeholder="Что важно знать: для кого продукт, чем отличается (необязательно)" className={`${INPUT} resize-none text-sm`} />
            <button className="w-full rounded-2xl bg-[linear-gradient(180deg,#ff9a55,#ff7a2f_55%,#f06a20)] py-4 font-semibold text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_14px_44px_-12px_rgba(255,122,47,0.9)] transition hover:-translate-y-0.5">
              Запустить завод
            </button>
          </motion.form>
        ) : (
          <motion.div key="progress" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-3 rounded-[28px] glass p-6">
            {STAGES.map((s, i) => (
              <div key={s} className={`flex items-center gap-3 text-sm transition ${i <= stage ? "text-foreground" : "text-white/30"}`}>
                <span className={`grid size-6 place-items-center rounded-full text-xs ${i < stage ? "bg-[#ff7a2f] text-black" : i === stage ? "ring-2 ring-[#ff7a2f]" : "ring-1 ring-white/15"}`}>
                  {i < stage ? "✓" : i === stage ? <span className="size-2 animate-ping rounded-full bg-[#ff7a2f]" /> : ""}
                </span>
                {s}
              </div>
            ))}
            <p className="pt-2 text-xs text-muted">Обычно 1–2 минуты. Не закрывай вкладку.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
