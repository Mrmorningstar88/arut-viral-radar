// Светлый фон неоморфизма: мягкие пятна цветов лого (оранжевый, розовый, фиолетовый).
// Статичные градиенты без blur-фильтров и анимаций: браузер рисует их один раз, прокрутка и клики не тормозят.
export function Ambient() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        background: [
          "radial-gradient(60vmax 45vmax at 90% -5%, rgba(112,72,232,0.16), transparent 70%)",
          "radial-gradient(50vmax 40vmax at 40% 105%, rgba(240,101,149,0.12), transparent 70%)",
          "radial-gradient(35vmax 30vmax at 55% 15%, rgba(255,169,77,0.10), transparent 70%)",
          "radial-gradient(45vmax 40vmax at -5% 40%, rgba(255,255,255,0.8), transparent 70%)",
        ].join(", "),
      }}
    />
  );
}
