"use client";

import { useTransition } from "react";
import { setPlan } from "@/app/settings/actions";
import { useToast } from "@/components/ui/toast";

export function PlanToggle({ userId, plan }: { userId: string; plan: "free" | "pro" }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <div className={`inline-grid grid-cols-2 gap-0.5 rounded-full bg-white/[0.05] p-0.5 text-xs ${pending ? "opacity-50" : ""}`}>
      {(["free", "pro"] as const).map((p) => (
        <button
          key={p}
          disabled={pending || p === plan}
          onClick={() =>
            start(async () => {
              const r = await setPlan(userId, p);
              if (r.error) toast(r.error, "error");
            })
          }
          className={`rounded-full px-3 py-1 ${p === plan ? (p === "pro" ? "bg-[#ff7a2f] text-black" : "bg-white text-black") : "text-muted hover:text-foreground"}`}
        >
          {p === "pro" ? "Pro" : "Free"}
        </button>
      ))}
    </div>
  );
}
