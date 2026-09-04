"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

const FLAGS: { value: "important" | "review_in_session" | "needs_attention"; label: string }[] = [
  { value: "important", label: "Importante" },
  { value: "review_in_session", label: "Revisar na consulta" },
  { value: "needs_attention", label: "Necessita atenção" },
];

export function ResponseFlagPicker({
  responseId,
  psychologistId,
  initialFlags,
}: {
  responseId: string;
  psychologistId: string;
  initialFlags: string[];
}) {
  const supabase = createClient();
  const [active, setActive] = useState(new Set(initialFlags));

  async function toggle(flag: string) {
    const isActive = active.has(flag);

    if (isActive) {
      await supabase
        .from("response_flags")
        .delete()
        .eq("response_id", responseId)
        .eq("flag", flag);
      setActive((prev) => {
        const next = new Set(prev);
        next.delete(flag);
        return next;
      });
    } else {
      await supabase
        .from("response_flags")
        .insert({ response_id: responseId, psychologist_id: psychologistId, flag });
      setActive((prev) => new Set(prev).add(flag));
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {FLAGS.map((f) => (
        <button
          key={f.value}
          onClick={() => toggle(f.value)}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
            active.has(f.value)
              ? "border-amber-300 bg-amber-100 text-amber-800"
              : "border-slate-200 text-slate-500 hover:bg-slate-50"
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
