// Лого YOOMP «Лесенка рилсов»: три вертикальных ролика растут, как график просмотров.
// Цвета ступенек совпадают с цветами этапов: сценарий, сториборд, ролик.
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 130 130" className={className} aria-hidden>
      <rect x="10" y="62" width="30" height="56" rx="9" fill="#ffa94d" />
      <rect x="50" y="38" width="30" height="80" rx="9" fill="#f06595" />
      <rect x="90" y="10" width="30" height="108" rx="9" fill="#7048e8" />
      <path d="M100 54 L112 62 L100 70 Z" fill="#fff" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className="text-lg font-black tracking-tight">yoomp</span>
    </span>
  );
}
