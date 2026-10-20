"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/reels", label: "Ролики", match: ["/reels"] },
  { href: "/redpill", label: "Red Pill", match: ["/redpill"] },
  { href: "/sources", label: "Добавить", match: ["/sources"] },
  {
    href: "/settings",
    label: "⚙ Настройки",
    match: ["/settings", "/persona", "/learning", "/runs"],
  },
];

export function Nav() {
  const path = usePathname();
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-black/40 backdrop-blur-2xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link
            href="/reels"
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <span className="relative grid size-7 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-white/20 [animation-duration:2.5s]" />
              <span className="size-3 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]" />
            </span>
            <span className="font-display text-sm font-semibold tracking-wide">
              VIRAL RADAR
            </span>
          </Link>
          <nav className="hidden flex-1 gap-1 md:flex overflow-x-auto text-sm [scrollbar-width:none]">
            {TABS.map((t) => {
              const active = t.match.some((m) => path.startsWith(m));
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`relative rounded-full px-3 py-1.5 whitespace-nowrap transition-colors ${active ? "text-foreground" : "text-muted hover:text-foreground"}`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-white/[0.08] ring-1 ring-white/10"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 34,
                      }}
                    />
                  )}
                  <span className="relative">{t.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <nav className="fixed inset-x-3 bottom-3 z-30 flex justify-around rounded-full glass-strong p-1.5 text-xs md:hidden">
        {TABS.map((t) => {
          const active = t.match.some((m) => path.startsWith(m));
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`relative flex-1 rounded-full px-2 py-2 text-center whitespace-nowrap ${active ? "text-black" : "text-muted"}`}
            >
              {active && (
                <motion.span
                  layoutId="nav-pill-m"
                  className="absolute inset-0 rounded-full bg-white"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative">{t.label.replace("⚙ ", "")}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
