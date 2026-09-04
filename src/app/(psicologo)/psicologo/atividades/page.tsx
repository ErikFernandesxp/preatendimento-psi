import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { activityResponseTypeLabel, formatDate } from "@/lib/utils/format";
import { SendActivityButton } from "@/components/activities/SendActivityButton";
import { DeleteActivityButton } from "@/components/activities/DeleteActivityButton";

export default async function AtividadesPage() {
  const supabase = await createClient();

  const [{ data: activities }, { data: patients }] = await Promise.all([
    supabase.from("activities").select("*").order("created_at", { ascending: false }),
    supabase
      .from("patients")
      .select("id, profiles ( name )")
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Atividades</h1>
          <p className="text-sm text-slate-500">Modelos de atividade que você criou.</p>
        </div>
        <LinkButton href="/psicologo/atividades/nova">+ Nova atividade</LinkButton>
      </div>

      {!activities || activities.length === 0 ? (
        <EmptyState
          title="Nenhuma atividade criada ainda"
          description="Crie um modelo de atividade para enviar aos seus pacientes."
          action={<LinkButton href="/psicologo/atividades/nova">+ Nova atividade</LinkButton>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {activities.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-900">{a.title}</h3>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={a.status === "sent" ? "info" : "neutral"}>
                    {activityResponseTypeLabel[a.response_type]}
                  </Badge>
                  <DeleteActivityButton
                    activityId={a.id}
                    activityTitle={a.title}
                    alreadySent={a.status === "sent"}
                  />
                </div>
              </div>
              {a.description && (
                <p className="mt-2 text-sm text-slate-500 line-clamp-2">{a.description}</p>
              )}
              <p className="mt-2 text-xs text-slate-400">
                Criada em {formatDate(a.created_at)}
                {a.is_required ? " · obrigatória" : " · opcional"}
                {a.allow_attachments ? " · permite anexos" : ""}
              </p>

              <SendActivityButton
                activityId={a.id}
                patients={(patients ?? []).map((p: any) => ({ id: p.id, name: p.profiles?.name }))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
