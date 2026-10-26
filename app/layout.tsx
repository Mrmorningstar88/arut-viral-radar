import type { Metadata } from "next";
import { Inter, Unbounded } from "next/font/google";
import { Ambient } from "@/components/ui/ambient";
import { MotionRoot } from "@/components/ui/motion-root";
import { ToastProvider } from "@/components/ui/toast";
import { NavShell } from "@/components/nav-shell";
import { Suspense } from "react";
import { isDemo } from "@/lib/db";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "cyrillic"] });
const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "YOOMP",
  description: "Контент-завод: залёты, сценарии и ролики для твоих организаций",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const demo = isDemo();
  return (
    <html lang="ru" className={`${inter.variable} ${unbounded.variable} h-full antialiased`}>
      <body className="relative isolate min-h-full font-sans">
        <Ambient />
        <MotionRoot>
        <ToastProvider>
        <Suspense fallback={<div className="h-14 border-b border-border" />}>
          <NavShell />
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
        </MotionRoot>
      </body>
    </html>
  );
}
