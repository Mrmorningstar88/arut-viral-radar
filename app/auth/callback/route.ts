import { NextResponse, type NextRequest } from "next/server";
import { authClient } from "@/lib/auth/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) await (await authClient()).auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL("/", request.url));
}
