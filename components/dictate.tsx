"use client";

import { useEffect, useRef, useState } from "react";

// Надиктовать голосом: распознавание речи браузера (Chrome, Safari), текст дописывается в поле.
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: (e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

const engine = () => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export function Dictate({ onText }: { onText: (text: string) => void }) {
  const [on, setOn] = useState(false);
  const [supported, setSupported] = useState(false);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => {
    setSupported(!!engine()); // eslint-disable-line react-hooks/set-state-in-effect -- известно только в браузере
    return () => rec.current?.stop();
  }, []);

  if (!supported) return null;

  const toggle = () => {
    if (on) return rec.current?.stop();
    const Engine = engine()!;
    const r = new Engine();
    r.lang = "ru-RU";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) onText(e.results[i][0].transcript.trim());
    };
    r.onend = () => setOn(false);
    rec.current = r;
    r.start();
    setOn(true);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition ${on ? "bg-rose-500/20 text-rose-200" : "bg-ink/[0.06] text-muted hover:text-foreground"}`}
    >
      <span className={`size-2 rounded-full ${on ? "animate-pulse bg-rose-400" : "bg-accent"}`} />
      {on ? "Слушаю… нажми, чтобы остановить" : "Надиктовать"}
    </button>
  );
}
