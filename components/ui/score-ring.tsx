"use client";

import { motion } from "motion/react";

// Кольцо «насколько это твоё»: цвет от серого к золотому по мере роста оценки.
export function ScoreRing({ value, size = 44 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 80 ? "#f5b544" : value >= 60 ? "#a3a3f5" : "#71717a";
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} title="Насколько подходит тебе">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={4} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={4} fill="none" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="absolute text-xs font-semibold tabular-nums">{value}</span>
    </div>
  );
}
