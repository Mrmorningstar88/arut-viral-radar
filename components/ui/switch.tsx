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
      className="group flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
    >
      <span className="min-w-0">
        <span
          className={`block text-sm transition-colors ${checked ? "text-foreground" : "text-muted"}`}
        >
          {label}
        </span>
        {hint && (
          <span className="block truncate text-xs text-white/35">{hint}</span>
        )}
      </span>
      <span
        className={`relative flex h-[26px] w-[44px] shrink-0 items-center rounded-full p-[3px] transition-colors duration-300 ${
          checked
            ? "justify-end bg-white shadow-[0_0_18px_-4px_rgba(255,255,255,0.55)]"
            : "justify-start bg-white/[0.1] ring-1 ring-white/10"
        }`}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 600, damping: 34 }}
          className={`size-5 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.35)] ${checked ? "bg-black" : "bg-white/80"}`}
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
    <div className="flex rounded-full bg-white/[0.04] p-1 ring-1 ring-white/[0.08]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`relative flex-1 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${value === o.value ? "text-black" : "text-muted hover:text-foreground"}`}
        >
          {value === o.value && (
            <motion.span
              layoutId={`pills-${id}`}
              className="absolute inset-0 rounded-full bg-white"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
