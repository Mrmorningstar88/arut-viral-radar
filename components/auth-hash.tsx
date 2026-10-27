"use client";

import { useEffect } from "react";

// Если Supabase вернул ссылку из письма на главную (а не на /auth/callback), доводим вход до конца там.
export function AuthHash() {
  useEffect(() => {
    const { hash, pathname } = window.location;
    if (pathname !== "/auth/callback" && /(^|[#&])(access_token|error)=/.test(hash)) window.location.replace(`/auth/callback${hash}`);
  }, []);
  return null;
}
