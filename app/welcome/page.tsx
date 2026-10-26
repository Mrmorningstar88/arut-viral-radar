import { Onboarding } from "@/components/onboarding";
import { requireUser } from "@/lib/auth/server";
import { myProjectIds } from "@/lib/projects";

// Мастер первого запуска: ссылка → образ проекта → первые сценарии на доске.
export const maxDuration = 300;

export default async function Welcome() {
  const user = await requireUser();
  const first = (await myProjectIds(user)).length === 0;
  return <Onboarding first={first} />;
}
