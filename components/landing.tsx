import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";
import { PLANS } from "@/lib/plans";
import { OPUS_FRAME } from "@/lib/studio/styles";

// Главная для гостя: что это, как работает, тарифы, кнопка «Начать бесплатно».

const STEPS = [
  { n: "01", title: "Ссылка", text: "Вставь ссылку на продукт, сайт или аккаунт. YOOMP сам прочитает, кто аудитория, какие боли и что обещает продукт." },
  { n: "02", title: "Сценарии", text: "Берём механику роликов, которые залетели в Instagram и TikTok, и переносим её на твой продукт: хук, озвучка, надписи." },
  { n: "03", title: "Сториборд", text: "Каждый кадр расписан. Выбираешь один из 59 визуальных стилей: от акварели до тёмного тех-кейноута." },
  { n: "04", title: "Готовый ролик", text: "Вертикальное видео с голосом и музыкой собирается само. Ты только говоришь «да» или «переделай»." },
];

const STYLES = ["dark-keynote", "watercolor", "risograph", "iso-infographic", "art-deco", "whiteboard", "blueprint", "ukiyoe"];

const BOARD = [
  { stage: "Сценарий", title: "«Почему 90% стартапов врут про метрики»", tone: "bg-white/[0.06]" },
  { stage: "Сториборд", title: "6 кадров · Dark Tech Keynote", tone: "bg-white/[0.06]" },
  { stage: "Ролик готов", title: "0:32 · голос, субтитры, музыка", tone: "bg-[#ff7a2f]/15 ring-1 ring-[#ff7a2f]/30" },
];

export function Landing() {
  return (
    <div className="space-y-24 pb-10 md:space-y-32">
      <section className="grid items-center gap-10 pt-6 md:grid-cols-[1.15fr_1fr] md:pt-14">
        <Reveal>
          <p className="text-xs font-semibold tracking-widest text-[#ff7a2f] uppercase">Контент-завод на Claude</p>
          <h1 className="mt-4 font-display text-4xl leading-[1.08] font-semibold md:text-6xl">
            Ссылка на продукт.
            <br />
            <span className="text-[#ff7a2f]">Ролики, которые залетают.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted md:text-lg">
            YOOMP изучает залетевшие Reels и TikTok, разбирает, почему они сработали, и делает по этой формуле сценарии, сториборды и готовые вертикальные видео для твоего продукта.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login?mode=signup"
              className="rounded-full bg-[linear-gradient(180deg,#ff9a55,#ff7a2f_55%,#f06a20)] px-7 py-3.5 font-semibold text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_14px_44px_-12px_rgba(255,122,47,0.9)] transition hover:-translate-y-0.5"
            >
              Начать бесплатно
            </Link>
            <Link href="/login" className="rounded-full glass px-7 py-3.5 font-medium transition hover:-translate-y-0.5">
              У меня есть аккаунт
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/40">Без карты. Первые сценарии через пару минут после регистрации.</p>
        </Reveal>

        <Reveal delay={0.1} className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[40px] bg-[#ff7a2f]/10 blur-3xl" />
          <div className="space-y-3 rounded-[32px] glass p-4">
            <div className="flex items-center gap-2 rounded-2xl bg-black/30 px-4 py-3 text-sm">
              <span className="text-white/40">🔗</span>
              <span className="truncate text-white/80">https://brainx.app</span>
              <span className="ml-auto rounded-full bg-[#ff7a2f] px-3 py-1 text-xs font-semibold text-black">Запустить</span>
            </div>
            {BOARD.map((b, i) => (
              <Reveal key={b.stage} delay={0.25 + i * 0.15}>
                <div className={`rounded-2xl p-4 ${b.tone}`}>
                  <p className="text-[10px] font-semibold tracking-wider text-[#ff7a2f] uppercase">{b.stage}</p>
                  <p className="mt-1 text-sm font-medium">{b.title}</p>
                </div>
              </Reveal>
            ))}
            <div className="flex gap-2 pt-1">
              {["Instagram", "TikTok"].map((n) => (
                <span key={n} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-muted">
                  → {n}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <section>
        <Reveal>
          <h2 className="font-display text-2xl font-semibold md:text-3xl">Как это работает</h2>
          <p className="mt-2 text-muted">Четыре шага, на каждом ты нажимаешь одну кнопку.</p>
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.07} className="rounded-3xl glass p-5">
              <span className="font-display text-sm text-[#ff7a2f]">{s.n}</span>
              <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section>
        <Reveal>
          <h2 className="font-display text-2xl font-semibold md:text-3xl">59 стилей видео</h2>
          <p className="mt-2 text-muted">Ролик рисуется кодом кадр за кадром, поэтому каждый выглядит как работа моушн-дизайнера.</p>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {STYLES.map((slug, i) => (
            <Reveal key={slug} delay={i * 0.04} className="overflow-hidden rounded-2xl ring-1 ring-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={OPUS_FRAME(slug)} alt="" loading="lazy" className="aspect-video w-full object-cover" />
            </Reveal>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-white/30">Стили: lemo-opuscar, CC BY 4.0</p>
      </section>

      <section>
        <Reveal>
          <h2 className="font-display text-2xl font-semibold md:text-3xl">Тарифы</h2>
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {(["free", "pro"] as const).map((id, i) => {
            const p = PLANS[id];
            const pro = id === "pro";
            return (
              <Reveal key={id} delay={i * 0.08} className={`rounded-3xl p-6 ${pro ? "glass ring-1 ring-[#ff7a2f]/40" : "glass"}`}>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-xl font-semibold">{p.name}</h3>
                  <span className={pro ? "text-[#ff7a2f]" : "text-muted"}>{p.price}</span>
                </div>
                <ul className="mt-5 space-y-2 text-sm">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex gap-2">
                      <span className="text-[#ff7a2f]">✓</span>
                      {perk}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login?mode=signup"
                  className={`mt-6 block rounded-full py-3 text-center font-medium ${pro ? "bg-[#ff7a2f] text-black" : "bg-white/[0.08] hover:bg-white/[0.12]"}`}
                >
                  {pro ? "Начать и запросить Pro" : "Начать бесплатно"}
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      <Reveal className="rounded-[32px] glass p-8 text-center md:p-14">
        <h2 className="font-display text-2xl font-semibold md:text-4xl">Первый сценарий через 2 минуты</h2>
        <p className="mx-auto mt-3 max-w-lg text-muted">Зарегистрируйся, вставь ссылку на свой продукт и посмотри, что получится.</p>
        <Link href="/login?mode=signup" className="mt-6 inline-block rounded-full bg-white px-8 py-3.5 font-semibold text-black transition hover:-translate-y-0.5">
          Начать бесплатно
        </Link>
      </Reveal>
    </div>
  );
}
