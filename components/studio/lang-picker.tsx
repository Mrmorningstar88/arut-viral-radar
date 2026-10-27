"use client";

import { useTransition } from "react";
import { translateScript } from "@/app/studio/actions";
import { useToast } from "@/components/ui/toast";
import { asLang, LANGS, type Lang } from "@/lib/studio/lang";

// Язык ролика: озвучка, надписи и подпись. Смена языка переводит сценарий (и сториборд, если он уже есть).
export function LangPicker({ id, lang, editable }: { id: string; lang?: string; editable: boolean }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const current = asLang(lang);
  return (
    <section className="flex flex-wrap items-center gap-3 rounded-3xl glass px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold tracking-widest text-muted uppercase">Язык ролика</p>
        <p className="text-sm text-muted">{editable ? "Нажми другой язык, и сценарий перепишется на нём за минуту." : LANGS[current].label}</p>
      </div>
      {editable && (
        <div role="radiogroup" aria-label="Язык ролика" className="flex rounded-full bg-ink/[0.05] p-0.5 text-sm">
          {(Object.keys(LANGS) as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={current === l}
              title={LANGS[l].label}
              disabled={pending}
              onClick={() =>
                l !== current &&
                start(async () => {
                  const r = await translateScript(id, l);
                  toast(r.error ?? `Перевожу на ${LANGS[l].label}, около минуты`, r.error ? "error" : undefined);
                })
              }
              className={`min-h-10 rounded-full px-3 py-2 font-medium uppercase disabled:opacity-60 ${current === l ? "neo-on" : "text-muted hover:text-foreground"}`}
            >
              {l}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
