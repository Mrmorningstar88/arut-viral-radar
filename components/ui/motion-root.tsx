"use client";

import { MotionConfig } from "motion/react";

// Кто выключил анимации в системе, тот их и не видит.
export function MotionRoot({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
