import { getRepo } from "@/lib/db";
import { compact, dubaiDate } from "@/lib/format";

export default async function CreatorsPage() {
  const creators = await (await getRepo()).listCreators();
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Креаторы</h1>
      <p className="text-sm text-muted">Автор с роликом от 10M попадает сюда сам, и дальше его профиль проверяется каждый прогон.</p>
      <table className="w-full text-sm">
        <thead className="text-left text-muted"><tr><th className="py-2">Автор</th><th>Подписчики</th><th>Медиана просмотров</th><th>Проверен</th></tr></thead>
        <tbody>
          {creators.map((c) => (
            <tr key={c.username} className="border-t border-border">
              <td className="py-2"><a href={`https://www.instagram.com/${c.username}/`} target="_blank" rel="noreferrer" className="underline">@{c.username}</a></td>
              <td>{compact(c.followers)}</td><td>{compact(c.medianViews)}</td><td>{dubaiDate(c.lastCheckedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
