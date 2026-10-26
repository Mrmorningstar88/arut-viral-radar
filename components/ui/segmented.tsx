"use client";

import Link from "next/link";
import { motion } from "motion/react";

type Item = { href: string; label: string; active: boolean; count?: number };

// Переключатель с плавающей подложкой: активный пункт подсвечивается анимированной «таблеткой».
export function Segmented({ id, items, size = "md" }: { id: string; items: Item[]; size?: "sm" | "md" }) {
  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm";
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-full glass p-1 [scrollbar-width:none]">
      {items.map((it) => (
        <Link key={it.href} href={it.href} scroll={false} className={`relative whitespace-nowrap rounded-full ${pad} font-medium transition-colors ${it.active ? "font-semibold text-accent" : "text-muted hover:text-foreground"}`}>
          {it.active && (
            <motion.span
              layoutId={`seg-${id}`}
              className="absolute inset-0 rounded-full glass-inset"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          <span className="relative flex items-center gap-1.5">
            {it.label}
            {it.count != null && <span className={`tabular-nums ${it.active ? "text-accent/70" : "text-muted/70"}`}>{it.count}</span>}
          </span>
        </Link>
      ))}
    </div>
  );
}
