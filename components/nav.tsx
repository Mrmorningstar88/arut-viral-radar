"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/reels", label: "Reels" },
  { href: "/redpill", label: "Red Pill" },
  { href: "/queue", label: "Очередь" },
  { href: "/creators", label: "Креаторы" },
  { href: "/learning", label: "Обучение" },
  { href: "/persona", label: "Persona" },
  { href: "/runs", label: "Логи" },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/reels" className="flex items-center gap-2 whitespace-nowrap">
          <span className="relative grid size-7 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/30 [animation-duration:2.5s]" />
            <span className="size-3 rounded-full bg-gradient-to-br from-amber-200 to-orange-500" />
          </span>
          <span className="font-display text-sm font-semibold tracking-wide">VIRAL RADAR</span>
        </Link>
        <nav className="flex flex-1 gap-1 overflow-x-auto text-sm [scrollbar-width:none]">
          {TABS.map((t) => {
            const active = path.startsWith(t.href);
            return (
              <Link key={t.href} href={t.href} className={`relative rounded-full px-3 py-1.5 whitespace-nowrap transition-colors ${active ? "text-foreground" : "text-muted hover:text-foreground"}`}>
                {active && (
                  <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-white/[0.08] ring-1 ring-white/10" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                )}
                <span className="relative">{t.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
