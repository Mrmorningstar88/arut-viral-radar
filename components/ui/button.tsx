"use client";

import { motion, type HTMLMotionProps } from "motion/react";

type Variant = "primary" | "ghost" | "danger" | "success";

const STYLES: Record<Variant, string> = {
  primary: "bg-[linear-gradient(180deg,#ffffff,#e9e9ec)] text-black shadow-[inset_0_1px_0_rgba(255,255,255,1),inset_0_-1px_0_rgba(0,0,0,0.12),0_10px_36px_-14px_rgba(255,255,255,0.55)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_14px_44px_-12px_rgba(255,255,255,0.7)]",
  ghost: "glass-inset text-foreground hover:bg-white/[0.08]",
  danger: "border border-rose-400/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20",
  success: "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20",
};

export function Button({ variant = "ghost", className = "", ...props }: HTMLMotionProps<"button"> & { variant?: Variant }) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${STYLES[variant]} ${className}`}
      {...props}
    />
  );
}
