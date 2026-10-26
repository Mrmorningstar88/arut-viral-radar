"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createProject } from "@/app/actions";
import { Dictate } from "@/components/dictate";
import { useToast } from "@/components/ui/toast";

const STAGES = [
  "Открываю ссылки и читаю, что это за организация",
  "Ищу, кто аудитория и что о вас говорят",
  "Собираю паспорт: боли, выгоды, голос, рубрики",
  "Подбираю механики залетевших роликов",
];

const INPUT = "w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none transition placeholder:text-white/30 focus:border-[#ff7a2f]/60";

function Field({ label, hint, children, dictate }: { label: string; hint?: string; children: React.ReactNode; dictate?: (t: string) => void }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {label}
          {hint && <span className="ml-2 text-xs font-normal text-muted">{hint}</span>}
        </span>
        {dictate && <Dictate onText={dictate} />}
      </span>
      {children}
    </label>
  );
}

// Создание организации: название, ссылки, описание и рассказ о себе (можно надиктовать).
export function Onboarding({ first }: { first: boolean }) {
  const [pending, start] = useTransition();
  const [stage, setStage] = useState(0);
  const [about, setAbout] = useState("");
  const [me, setMe] = useState("");
  const router = useRouter();
  const toast = useToast();
  const add = (set: (f: (v: string) => string) => void) => (t: string) => set((v) => (v ? `${v} ${t}` : t));

  // Паспорт собирается 1–2 минуты одним запросом; шаги показывают, что происходит.
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 22_000);
    return () => clearInterval(t);
  }, [pending]);

  return (
    <div className="mx-auto max-w-2xl pt-4 md:pt-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <p className="text-xs font-semibold tracking-widest text-[#ff7a2f] uppercase">{first ? "Первый шаг" : "Новая организация"}</p>
        <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">Расскажи о своей организации</h1>
        <p className="mt-3 text-muted">YOOMP изучит всё, соберёт паспорт организации и сразу предложит первые сценарии роликов.</p>
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
                toast("Организация готова. Первые сценарии появятся через пару минут 🚀");
                router.push("/");
              });
            }}
            className="mt-8 space-y-5 rounded-[28px] glass p-5 md:p-7"
          >
            <Field label="Название">
              <input name="name" required autoFocus placeholder="Например, Фрикономист" className={INPUT} />
            </Field>
            <Field label="Ссылки" hint="сайт, Instagram, TikTok, YouTube: каждая с новой строки">
              <textarea name="links" rows={3} placeholder={"https://…\nhttps://instagram.com/…"} className={`${INPUT} resize-none font-mono text-sm`} />
            </Field>
            <Field label="Об организации" hint="что делаете, для кого, чем отличаетесь" dictate={add(setAbout)}>
              <textarea name="about" rows={4} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Можно своими словами или надиктовать" className={`${INPUT} resize-none text-sm`} />
            </Field>
            <Field label="О себе" hint="кто лицо бренда, как ты говоришь" dictate={add(setMe)}>
              <textarea name="me" rows={3} value={me} onChange={(e) => setMe(e.target.value)} placeholder="Необязательно" className={`${INPUT} resize-none text-sm`} />
            </Field>
            <button className="w-full rounded-2xl bg-[linear-gradient(180deg,#ff9a55,#ff7a2f_55%,#f06a20)] py-4 font-semibold text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_14px_44px_-12px_rgba(255,122,47,0.9)] transition hover:-translate-y-0.5">
              Создать организацию
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
