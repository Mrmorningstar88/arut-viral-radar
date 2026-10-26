"use client";

import { motion } from "motion/react";

// Тумблер как в iOS: бегунок едет на пружине, включённый трек светится белым.
export function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-ink/[0.04]"
    >
      <span className="min-w-0">
        <span
          className={`block text-sm transition-colors ${checked ? "text-foreground" : "text-muted"}`}
        >
          {label}
        </span>
        {hint && (
          <span className="block truncate text-xs text-ink/35">{hint}</span>
        )}
      </span>
      <span
        className={`relative flex h-[26px] w-[44px] shrink-0 items-center rounded-full p-[3px] transition-colors duration-300 ${
          checked
            ? "justify-end bg-[linear-gradient(180deg,#7b8cff,#5b6cff)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_0_20px_-4px_rgba(91,108,255,0.7)]"
            : "justify-start bg-ink/[0.1] ring-1 ring-ink/10"
        }`}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 600, damping: 34 }}
          className={`size-5 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.35)] ${checked ? "bg-paper" : "bg-ink/80"}`}
        />
      </span>
    </button>
  );
}

// Кнопочный выбор из нескольких вариантов, без ссылок (для пульта).
export function Pills<T extends string>({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="glass-inset flex rounded-full p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`relative flex-1 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${value === o.value ? "text-ink" : "text-muted hover:text-foreground"}`}
        >
          {value === o.value && (
            <motion.span
              layoutId={`pills-${id}`}
              className="absolute inset-0 rounded-full bg-paper"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
