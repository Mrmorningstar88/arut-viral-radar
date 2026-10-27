import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Обновляет сессию Supabase и отправляет на /login без сессии. Настоящая проверка
// делается в requireUser() и доступе к проекту; здесь только быстрый редирект.
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // getClaims проверяет токен на месте (без похода в Supabase Auth, если ключи асимметричные) и при надобности обновляет сессию.
  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims;
  const path = request.nextUrl.pathname;
  // Главная открыта всем: гость видит описание сервиса, вошедший — свой завод.
  const open = path === "/" || path.startsWith("/login") || path.startsWith("/auth");
  if (!signedIn && !open) return NextResponse.redirect(new URL("/login", request.url));
  if (signedIn && path.startsWith("/login")) return NextResponse.redirect(new URL("/", request.url));
  return response;
}

export const config = {
  matcher: ["/((?!api/inngest|api/cron|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|webp)$).*)"],
};
