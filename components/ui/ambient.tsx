// Мягкий свет за стеклом: три размытых пятна медленно дрейфуют, чтобы фон был живым, но не отвлекал.
export function Ambient() {
  return (
    <div aria-hidden className="ambient pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-[20%] right-[-10%] size-[60vmax] rounded-full bg-white/[0.05] blur-[120px] [animation:drift_26s_ease-in-out_infinite]" />
      <div className="absolute top-[30%] -left-[15%] size-[45vmax] rounded-full bg-[#d8c7a6]/[0.045] blur-[120px] [animation:drift_32s_ease-in-out_infinite_reverse]" />
      <div className="absolute -bottom-[25%] left-[30%] size-[50vmax] rounded-full bg-white/[0.035] blur-[140px] [animation:drift_38s_ease-in-out_infinite]" />
      <div className="absolute inset-0 opacity-[0.025] [background-image:radial-gradient(rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:3px_3px]" />
    </div>
  );
}
