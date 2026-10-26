"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Завод", match: ["/studio"], exact: true },
  { href: "/reels", label: "Залёты", match: ["/reels", "/sources", "/redpill"] },
  { href: "/projects", label: "Проекты", match: ["/projects"] },
  {
    href: "/settings",
    label: "⚙ Настройки",
    match: ["/settings", "/persona", "/learning", "/runs"],
  },
];

const isActive = (t: (typeof TABS)[number], path: string) => (t.exact && path === t.href) || t.match.some((m) => path.startsWith(m));

export function Nav() {
  const path = usePathname();
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-black/30 backdrop-blur-2xl backdrop-saturate-[1.8] shadow-[inset_0_-1px_0_rgba(255,255,255,0.06),0_10px_40px_-20px_rgba(0,0,0,0.8)]">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <span className="relative grid size-7 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#ff7a2f]/30 [animation-duration:2.5s]" />
              <span className="size-3 rounded-full bg-[#ff7a2f] shadow-[0_0_14px_rgba(255,122,47,0.8)]" />
            </span>
            <span className="font-display text-sm font-semibold tracking-wide">
              YOOMP
            </span>
          </Link>
          <nav className="hidden flex-1 gap-1 md:flex overflow-x-auto text-sm [scrollbar-width:none]">
            {TABS.map((t) => {
              const active = isActive(t, path);
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
          const active = isActive(t, path);
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
