import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Nav } from "@/components/nav";
import { Suspense } from "react";
import { isDemo } from "@/lib/db";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Viral Radar",
  description: "Залетевшие Reels и адаптации под твой образ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const demo = isDemo();
  return (
    <html lang="ru" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <Suspense fallback={<div className="h-14 border-b border-border" />}>
          <Nav />
        </Suspense>
        {demo && (
          <div className="border-b border-border bg-accent/10 px-4 py-2 text-center text-sm">
            Демо-режим: база не подключена, данные вымышленные и сбрасываются при перезапуске.
          </div>
        )}
        <main className="mx-auto max-w-5xl px-4 py-6">
          <Suspense fallback={<p className="text-muted">Загружаю…</p>}>{children}</Suspense>
        </main>
      </body>
    </html>
  );
}
