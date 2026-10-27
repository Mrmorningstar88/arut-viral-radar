// Языки сценариев и роликов: текст пишет Claude, голос edge-tts или ElevenLabs (multilingual), проверка речи whisper.
export const LANGS = {
  ru: { label: "Русский", write: "Пиши по-русски, живо, на «ты» к зрителю, без кальки с английского." },
  en: { label: "English", write: "Write in natural spoken English, addressing the viewer as “you”, punchy and native, not translated." },
  es: { label: "Español", write: "Escribe en español natural y hablado, tuteando al espectador, sin calcos del inglés." },
} as const;

export type Lang = keyof typeof LANGS;

export const asLang = (v: unknown): Lang => (typeof v === "string" && v in LANGS ? (v as Lang) : "ru");
