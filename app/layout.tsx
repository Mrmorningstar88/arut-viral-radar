import type { Metadata } from "next";
import { Inter, Unbounded } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { Nav } from "@/components/nav";
import { Suspense } from "react";
import { isDemo } from "@/lib/db";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "cyrillic"] });
const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Viral Radar",
  description: "Залетевшие Reels и адаптации под твой образ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const demo = isDemo();
  return (
    <html lang="ru" className={`${inter.variable} ${unbounded.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <ToastProvider>
        <Suspense fallback={<div className="h-14 border-b border-border" />}>
          <Nav />
        </Suspense>
        {demo && (
          <div className="border-b border-amber-400/10 bg-amber-400/[0.06] px-4 py-1.5 text-center text-xs text-amber-200/80">
            Демо-режим: база не подключена, данные вымышленные и сбрасываются при перезапуске.
          </div>
        )}
        <main className="mx-auto max-w-6xl px-4 pt-6 pb-28 md:pb-10">
          <Suspense fallback={<p className="text-muted">Загружаю…</p>}>{children}</Suspense>
        </main>
        </ToastProvider>
      </body>
    </html>
  );
}
