"use client";

import { motion, type HTMLMotionProps } from "motion/react";

// Нажатие рисует CSS (вдавливание за 100 мс), чтобы реакция не ждала пружинной анимации.

type Variant = "primary" | "ghost" | "danger" | "success";

const STYLES: Record<Variant, string> = {
  primary: "neo-primary text-white",
  ghost: "neo-btn text-foreground",
  danger: "neo-btn text-rose-200",
  success: "neo-btn text-emerald-200",
};

export function Button({ variant = "ghost", className = "", ...props }: HTMLMotionProps<"button"> & { variant?: Variant }) {
  return (
    <motion.button
      className={`inline-flex items-center gap-2 min-h-11 rounded-2xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${STYLES[variant]} ${className}`}
      {...props}
    />
  );
}
