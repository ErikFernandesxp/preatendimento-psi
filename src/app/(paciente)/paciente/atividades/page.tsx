import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge, statusTone } from "@/components/ui/Badge";
import { patientActivityStatusLabel, formatDate, isOverdue } from "@/lib/utils/format";
import Link from "next/link";

export default async function PacienteAtividadesPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("patient_activities")
    .select(
      `id, status, sent_at, due_date,
       activities ( title, description ),
       psychologists:activities ( psychologists ( professional_name ) )`
    )
    .order("sent_at", { ascending: false });

  const rows = (data ?? []) as any[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Minhas atividades</h1>
        <p className="text-sm text-slate-500">Atividades enviadas pelo seu psicólogo.</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Nenhuma atividade recebida ainda" />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/paciente/atividades/${r.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900">{r.activities?.title}</p>
                <Badge tone={isOverdue(r.due_date) && r.status === "pending" ? "danger" : statusTone(r.status)}>
                  {isOverdue(r.due_date) && r.status === "pending"
                    ? "Atrasada"
                    : patientActivityStatusLabel[r.status]}
                </Badge>
              </div>
              {r.activities?.description && (
                <p className="mt-1 text-sm text-slate-500">{r.activities.description}</p>
              )}
              <div className="mt-2 flex gap-4 text-xs text-slate-400">
                <span>Enviada em {formatDate(r.sent_at)}</span>
                {r.due_date && <span>Prazo: {formatDate(r.due_date)}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
