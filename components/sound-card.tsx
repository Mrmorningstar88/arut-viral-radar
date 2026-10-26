"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { chooseVoice, connectElevenLabs, createSound, disconnectElevenLabs } from "@/app/settings/actions";
import { AutoRefresh } from "@/components/studio/auto-refresh";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type Voice = { id: string; name: string; preview: string | null; own: boolean };
type Clip = { name: string; url: string };
type Sound = { voiceId?: string; status?: "making" | "ready" | "failed"; error?: string; idea?: string; theme?: Clip; sfx?: Clip[] };
const INPUT = "w-full rounded-xl border border-ink/10 bg-paper/30 px-3 py-2 text-sm outline-none focus:border-accent/60";

// Голос и фирменный звук организации: один раз ключ ElevenLabs, потом голос и звук для каждой организации.
export function SoundCard({ org, connected, voices, sound, error }: { org: string; connected: boolean; voices: Voice[]; sound: Sound | null; error: string | null }) {
  const [state, action, pending] = useActionState(connectElevenLabs, null);
  const [busy, start] = useTransition();
  const toast = useToast();
  const player = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [all, setAll] = useState(false);

  const play = (url: string) => {
    const a = player.current;
    if (!a) return;
    if (playing === url) {
      a.pause();
      setPlaying(null);
      return;
    }
    a.src = url;
    void a.play();
    setPlaying(url);
  };

  if (!connected)
    return (
      <form action={action} className="space-y-3">
        <p className="text-sm text-muted">
          Ролики говорят твоим голосом из ElevenLabs, а музыка и эффекты звучат по-фирменному. Вставь ключ из ElevenLabs → Developers → API Keys.
        </p>
        <input name="key" required placeholder="Ключ API ElevenLabs" autoComplete="off" className={INPUT} />
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Проверяю…" : "Подключить ElevenLabs"}
        </Button>
        {state && <p className={`text-xs ${state.error ? "text-rose-300" : "text-emerald-300"}`}>{state.error ?? state.message}</p>}
      </form>
    );

  // Сначала только свои голоса (клоны), без них первые шесть из библиотеки; выбранный виден всегда.
  const mine = voices.filter((v) => v.own);
  const base = mine.length > 0 ? mine : voices.slice(0, 6);
  const shown = all ? voices : [...base, ...voices.filter((v) => v.id === sound?.voiceId && !base.includes(v))];
  const making = sound?.status === "making";

  return (
    <div className="space-y-5">
      <audio ref={player} onEnded={() => setPlaying(null)} className="hidden" />
      <AutoRefresh active={making} every={5000} forMs={240_000} />

      <div className="space-y-2">
        <p className="text-sm text-muted">
          Голос организации <b className="text-foreground">{org}</b>:
        </p>
        {error && <p className="text-xs text-rose-300">{error}</p>}
        <ul className="space-y-1.5">
          {shown.map((v) => {
            const on = v.id === sound?.voiceId;
            return (
              <li key={v.id} className={`flex items-center gap-2 rounded-2xl px-2 py-1.5 ${on ? "glass-inset" : ""}`}>
                {v.preview && (
                  <button onClick={() => play(v.preview!)} aria-label={`Послушать голос ${v.name}`} className="grid size-10 shrink-0 place-items-center rounded-full neo-btn text-xs">
                    {playing === v.preview ? "❚❚" : "▶"}
                  </button>
                )}
                <span className="flex-1 text-sm">
                  <span className={`font-medium ${on ? "text-accent" : ""}`}>{v.name}</span>
                  {v.own && <span className="ml-2 text-xs text-muted">твой</span>}
                </span>
                {on ? (
                  <span className="pr-2 text-xs font-semibold text-accent">✓ выбран</span>
                ) : (
                  <Button
                    disabled={busy}
                    className="min-h-10"
                    onClick={() =>
                      start(async () => {
                        const r = await chooseVoice(v.id, v.name);
                        toast(r.error ?? `Ролики «${org}» говорят голосом «${v.name}»`, r.error ? "error" : undefined);
                      })
                    }
                  >
                    Выбрать голос
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        {!all && voices.length > shown.length && (
          <button onClick={() => setAll(true)} className="text-xs text-accent hover:underline">
            Показать все голоса ({voices.length})
          </button>
        )}
      </div>

      <div className="space-y-3 rounded-2xl bg-ink/[0.04] p-4">
        <p className="text-sm font-medium">Фирменный звук</p>
        {sound?.idea && <p className="text-sm text-muted">{sound.idea}</p>}
        {sound?.theme && (
          <div className="flex flex-wrap gap-2">
            {[sound.theme, ...(sound.sfx ?? [])].map((c) => (
              <button key={c.url} onClick={() => play(c.url)} className="inline-flex min-h-10 items-center gap-2 rounded-full neo-btn px-3 text-xs font-medium">
                {playing === c.url ? "❚❚" : "▶"} {c.name}
              </button>
            ))}
          </div>
        )}
        {sound?.status === "failed" && <p className="text-xs text-rose-300">Не получилось: {sound.error}</p>}
        {making ? (
          <p className="flex items-center gap-2 text-sm text-accent">
            <span className="size-2 animate-ping rounded-full bg-accent" /> Сочиняю тему и эффекты, 1–3 минуты. Страница обновится сама.
          </p>
        ) : (
          <Button
            variant={sound?.theme ? "ghost" : "primary"}
            disabled={busy}
            onClick={() =>
              start(async () => {
                const r = await createSound();
                toast(r.error ?? r.message ?? "", r.error ? "error" : undefined);
              })
            }
          >
            {sound?.theme ? "Сочинить звук заново" : "Создать фирменный звук"}
          </Button>
        )}
        <p className="text-xs text-muted">Тема и эффекты звучат в каждом ролике организации, поэтому тебя узнают с первой секунды.</p>
      </div>

      <button onClick={() => start(async () => void (await disconnectElevenLabs()))} className="text-xs text-muted hover:text-rose-300">
        Отключить ElevenLabs
      </button>
    </div>
  );
}
