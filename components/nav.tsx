"use client";

import Link from "next/link";
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
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-4 py-3 text-sm">
        <span className="mr-3 font-semibold whitespace-nowrap">Viral Radar</span>
        {TABS.map((t) => {
          const active = path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-md px-3 py-1.5 whitespace-nowrap ${active ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
