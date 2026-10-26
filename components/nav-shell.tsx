import { Nav } from "@/components/nav";
import { currentUser, isAdmin } from "@/lib/auth/server";
import { isDemo } from "@/lib/db";
import { planOf } from "@/lib/plans";

// Серверная обёртка: меню зависит от того, кто вошёл и на каком он тарифе.
export async function NavShell() {
  if (isDemo()) return <Nav user={{ email: "", radar: true, admin: false }} />;
  const user = await currentUser();
  return <Nav user={user && { email: user.email ?? "", radar: planOf(user) !== "free", admin: isAdmin(user) }} />;
}
