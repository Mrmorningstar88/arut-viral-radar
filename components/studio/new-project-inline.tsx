"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createProject } from "@/app/actions";
import { useToast } from "@/components/ui/toast";

// Новый проект прямо с главного экрана: вставил ссылку, и проект открылся с паспортом.
export function NewProjectInline() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="shrink-0 rounded-full border border-dashed border-white/15 px-4 py-1.5 text-sm text-muted transition hover:border-[#ff7a2f]/50 hover:text-foreground">
        + Проект по ссылке
      </button>
    );

  return (
    <form
      action={() =>
        start(async () => {
          const fd = new FormData();
          fd.set("url", url);
          const r = await createProject(fd);
          if (r.error) return toast(r.error, "error");
          setUrl("");
          setOpen(false);
          toast("Проект готов и открыт. Жми «Придумать 5 сценариев» 🚀");
          router.refresh();
        })
      }
      className="flex shrink-0 items-center gap-1.5"
    >
      <input
        autoFocus
        required
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={pending}
        placeholder="https://сайт-продукта"
        className="w-56 rounded-full border border-[#ff7a2f]/40 bg-black/40 px-4 py-1.5 text-sm outline-none placeholder:text-white/30 sm:w-72"
      />
      <button disabled={pending} className="rounded-full bg-[#ff7a2f] px-4 py-1.5 text-sm font-semibold text-black disabled:opacity-60">
        {pending ? "Читаю сайт…" : "Создать"}
      </button>
      {!pending && (
        <button type="button" onClick={() => setOpen(false)} className="px-2 text-sm text-muted hover:text-foreground">
          ✕
        </button>
      )}
    </form>
  );
}
