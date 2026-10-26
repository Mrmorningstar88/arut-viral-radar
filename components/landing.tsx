import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";
import { PLANS } from "@/lib/plans";
import { OPUS_FRAME } from "@/lib/studio/styles";

// Главная для гостя: что это, как работает, тарифы, кнопка «Начать бесплатно».

const STEP_INK = ["text-st-script-ink", "text-st-board-ink", "text-st-prod-ink", "text-st-pub-ink"];

const STEPS = [
  { n: "01", title: "Организация", text: "Создай организацию: название, ссылки, пара слов о себе (можно голосом). YOOMP сам прочитает, кто аудитория, какие боли и что обещает продукт." },
  { n: "02", title: "Сценарии", text: "Берём механику роликов, которые залетели в Instagram и TikTok, и переносим её на твой продукт: хук, озвучка, надписи." },
  { n: "03", title: "Сториборд", text: "Каждый кадр расписан. Выбираешь один из 59 визуальных стилей: от акварели до тёмного тех-кейноута." },
  { n: "04", title: "Готовый ролик", text: "Видео с голосом, музыкой и звуковыми акцентами собирается само. Отметил «Выпустить», и оно уходит в соцсети организации." },
];

const STYLES = ["dark-keynote", "watercolor", "risograph", "iso-infographic", "art-deco", "whiteboard", "blueprint", "ukiyoe"];

const BOARD = [
  { stage: "Сценарий", title: "«Почему 90% стартапов врут про метрики»", tone: "neo-btn before:bg-st-script", ink: "text-st-script-ink" },
  { stage: "Сториборд", title: "6 кадров · Dark Tech Keynote", tone: "neo-btn before:bg-st-board", ink: "text-st-board-ink" },
  { stage: "Ролик готов", title: "0:32 · голос, субтитры, музыка", tone: "neo-btn before:bg-st-prod", ink: "text-st-prod-ink" },
];

export function Landing() {
  return (
    <div className="space-y-24 pb-10 md:space-y-32">
      <section className="grid items-center gap-10 pt-6 md:grid-cols-[1.15fr_1fr] md:pt-14">
        <Reveal>
          <p className="text-xs font-semibold tracking-widest text-accent uppercase">Контент-завод на Claude</p>
          <h1 className="mt-4 font-display text-4xl leading-[1.08] font-semibold md:text-6xl">
            Ссылка на продукт.
            <br />
            <span className="bg-gradient-to-r from-[#d9480f] via-[#c2255c] to-[#6741d9] bg-clip-text text-transparent">Ролики, которые залетают.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted md:text-lg">
            YOOMP изучает залетевшие Reels и TikTok, разбирает, почему они сработали, и делает по этой формуле сценарии, сториборды и готовые вертикальные видео для твоего продукта.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login?mode=signup"
              className="rounded-full neo-primary px-7 py-3.5 font-semibold text-white"
            >
              Начать бесплатно
            </Link>
            <Link href="/login" className="rounded-full neo-btn px-7 py-3.5 font-medium">
              У меня есть аккаунт
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted">Без карты. Первые сценарии через пару минут после регистрации.</p>
        </Reveal>

        <Reveal delay={0.1} className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[40px] bg-accent/10 blur-3xl" />
          <div className="space-y-3 rounded-[32px] glass p-4">
            <div className="flex items-center gap-2 rounded-2xl glass-inset px-4 py-3 text-sm">
              <span className="text-ink/40">🔗</span>
              <span className="truncate text-ink/80">https://brainx.app</span>
              <span className="ml-auto rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">Запустить</span>
            </div>
            {BOARD.map((b, i) => (
              <Reveal key={b.stage} delay={0.25 + i * 0.15}>
                <div className={`relative overflow-hidden rounded-2xl p-4 pl-5 before:absolute before:inset-y-3 before:left-0 before:w-1 before:rounded-r-full ${b.tone}`}>
                  <p className={`text-[10px] font-semibold tracking-wider uppercase ${b.ink}`}>{b.stage}</p>
                  <p className="mt-1 text-sm font-medium">{b.title}</p>
                </div>
              </Reveal>
            ))}
            <div className="flex gap-2 pt-1">
              {["Instagram", "TikTok"].map((n) => (
                <span key={n} className="rounded-full bg-ink/[0.06] px-3 py-1 text-xs text-muted">
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
              <span className={`font-display text-sm font-bold ${STEP_INK[i]}`}>{s.n}</span>
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
            <Reveal key={slug} delay={i * 0.04} className="overflow-hidden rounded-2xl ring-1 ring-ink/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={OPUS_FRAME(slug)} alt="" loading="lazy" className="aspect-video w-full object-cover" />
            </Reveal>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted">Стили: lemo-opuscar, CC BY 4.0</p>
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
              <Reveal key={id} delay={i * 0.08} className={`rounded-3xl p-6 ${pro ? "glass ring-1 ring-accent/40" : "glass"}`}>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-xl font-semibold">{p.name}</h3>
                  <span className={pro ? "text-accent" : "text-muted"}>{p.price}</span>
                </div>
                <ul className="mt-5 space-y-2 text-sm">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex gap-2">
                      <span className="text-accent">✓</span>
                      {perk}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login?mode=signup"
                  className={`mt-6 block rounded-full py-3 text-center font-medium ${pro ? "neo-primary text-white" : "neo-btn"}`}
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
        <Link href="/login?mode=signup" className="mt-6 inline-block rounded-full neo-primary px-8 py-3.5 font-semibold text-white">
          Начать бесплатно
        </Link>
      </Reveal>
    </div>
  );
}
