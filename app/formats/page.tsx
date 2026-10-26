import { connection } from "next/server";
import { FormatExplorer } from "@/components/formats/explorer";
import { LabelButton } from "@/components/formats/label-button";
import { Reveal } from "@/components/ui/reveal";
import { Segmented } from "@/components/ui/segmented";
import { isDemo } from "@/lib/db";
import { fmtMultiple } from "@/lib/formats/catalog";
import { demoBoard } from "@/lib/formats/demo";
import { formatBoard } from "@/lib/formats/store";
import { compact } from "@/lib/format";
import { currentWorkspace } from "@/lib/projects";

// Разметка 60 роликов идёт в фоне после ответа.
export const maxDuration = 300;

export default async function FormatsPage() {
  await connection();
  const board = isDemo() ? demoBoard() : await formatBoard(await currentWorkspace());
  const labeled = board.reels.length - board.unlabeled;
  const leader = board.ranks.find((r) => r.enough) ?? board.ranks[0];

  return (
    <div className="space-y-6">
      <Reveal className="space-y-4">
        <Segmented
          id="reels-view"
          items={[
            { href: "/reels", label: "Каталог", active: false },
            { href: "/formats", label: "Форматы", active: true },
          ]}
        />
        <div>
          <h1 className="font-display text-2xl font-semibold">Какие форматы залетают</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Каждый найденный залёт разложен по формату подачи. Рейтинг показывает, во сколько раз медиана просмотров формата выше типичного залёта в нише.
            Сценарии в первую очередь берут механики сильных форматов.
          </p>
          {board.shared && <p className="mt-2 text-xs text-muted">Своих залётов у организации пока мало, поэтому показана общая база формул YOOMP.</p>}
        </div>
      </Reveal>

      <Reveal delay={0.03} className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Залётов с форматом" value={String(labeled)} />
        <Stat label="Форматов" value={String(board.ranks.length)} />
        <Stat label="Медиана просмотров" value={compact(board.overallMedian)} />
        <Stat label="Сильнейший формат" value={leader ? `${leader.label} ${fmtMultiple(leader.multiple)}` : "—"} />
      </Reveal>

      {board.unlabeled > 0 && (
        <Reveal delay={0.05} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl glass p-4">
          <p className="text-sm">
            {board.unlabeled} {board.unlabeled === 1 ? "ролик ещё без формата" : "роликов ещё без формата"}. Новые залёты размечаются сами после каждого поиска.
          </p>
          <LabelButton count={board.unlabeled} />
        </Reveal>
      )}

      {board.ranks.length > 0 ? (
        <Reveal delay={0.07}>
          <FormatExplorer ranks={board.ranks} reels={board.reels} />
        </Reveal>
      ) : (
        board.unlabeled === 0 && (
          <Reveal className="rounded-3xl glass p-10 text-center text-sm text-muted">Пока нет залётов. Как только радар их найдёт, здесь появится рейтинг форматов.</Reveal>
        )
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl glass p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-lg leading-snug font-semibold tabular-nums">{value}</p>
    </div>
  );
}
