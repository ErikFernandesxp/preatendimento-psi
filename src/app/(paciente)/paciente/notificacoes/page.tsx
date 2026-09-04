import { createClient } from "@/lib/supabase/server";
import { NotificationList } from "@/components/notifications/NotificationList";

export default async function NotificacoesPacientePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("notifications")
    .select("id, title, message, read, created_at")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Notificações</h1>
        <p className="text-sm text-slate-500">Avisos sobre suas atividades.</p>
      </div>
      <NotificationList initial={data ?? []} />
    </div>
  );
}
