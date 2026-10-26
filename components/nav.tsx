"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { motion } from "motion/react";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; match: string[]; exact?: boolean };

const FACTORY: Tab = { href: "/", label: "Завод", match: ["/studio"], exact: true };
const RADAR: Tab = { href: "/reels", label: "Залёты", match: ["/reels", "/sources", "/redpill"] };
const PROJECTS: Tab = { href: "/projects", label: "Организации", match: ["/projects", "/welcome"] };
const SETTINGS: Tab = { href: "/settings", label: "⚙ Настройки", match: ["/settings", "/persona", "/learning", "/runs"] };
const ADMIN: Tab = { href: "/admin", label: "Клиенты", match: ["/admin"] };

const isActive = (t: Tab, path: string) => (t.exact && path === t.href) || t.match.some((m) => path.startsWith(m));

export type NavUser = { email: string; radar: boolean; admin: boolean } | null;

export function Nav({ user }: { user: NavUser }) {
  const path = usePathname();
  // Гость видит только логотип и вход; залёты есть у админа и на Pro.
  const TABS = !user ? [] : [FACTORY, ...(user.radar ? [RADAR] : []), PROJECTS, SETTINGS, ...(user.admin ? [ADMIN] : [])];
  return (
    <>
      <header className="sticky top-0 z-20 glass-strong rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link href="/" aria-label="YOOMP, на главную" className="flex min-h-11 items-center whitespace-nowrap">
            <Logo />
          </Link>
          <nav className="hidden flex-1 gap-1 md:flex overflow-x-auto text-sm [scrollbar-width:none]">
            {TABS.map((t) => {
              const active = isActive(t, path);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative rounded-full px-3 py-1.5 whitespace-nowrap transition-colors ${active ? "text-foreground" : "text-muted hover:text-foreground"}`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full glass-inset"
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
          {!user && (
            <div className="ml-auto flex items-center gap-2 text-sm">
              <Link href="/login" className="rounded-full px-3 py-2 text-muted hover:text-foreground">
                Войти
              </Link>
              <Link href="/login?mode=signup" className="rounded-full neo-primary px-4 py-2 font-medium text-white">
                Начать бесплатно
              </Link>
            </div>
          )}
        </div>
      </header>
      {TABS.length > 0 && (
      <nav className="fixed inset-x-3 bottom-3 z-30 flex justify-around rounded-full glass-strong p-1.5 text-xs md:hidden">
        {TABS.map((t) => {
          const active = isActive(t, path);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-11 flex-1 items-center justify-center rounded-full px-2 text-center whitespace-nowrap ${active ? "font-semibold text-accent" : "text-muted"}`}
            >
              {active && (
                <motion.span
                  layoutId="nav-pill-m"
                  className="absolute inset-0 rounded-full glass-inset"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative">{t.label.replace("⚙ ", "")}</span>
            </Link>
          );
        })}
      </nav>
      )}
    </>
  );
}
