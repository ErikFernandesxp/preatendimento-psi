"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRelative } from "@/lib/utils/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils/cn";

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export function NotificationList({ initial }: { initial: NotificationRow[] }) {
  const supabase = createClient();
  const [items, setItems] = useState(initial);

  async function markAsRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  }

  if (items.length === 0) {
    return <EmptyState title="Nenhuma notificação por aqui" />;
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {items.map((n) => (
        <li
          key={n.id}
          onClick={() => !n.read && markAsRead(n.id)}
          className={cn(
            "cursor-pointer px-4 py-3 transition-colors",
            !n.read && "bg-slate-50"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={cn("text-sm", !n.read ? "font-semibold text-slate-900" : "text-slate-600")}>
                {n.title}
              </p>
              <p className="text-sm text-slate-500">{n.message}</p>
            </div>
            {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-900" />}
          </div>
          <p className="mt-1 text-xs text-slate-400">{formatRelative(n.created_at)}</p>
        </li>
      ))}
    </ul>
  );
}
