import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge, statusTone } from "@/components/ui/Badge";
import { patientActivityStatusLabel, formatDate, isOverdue } from "@/lib/utils/format";
import Link from "next/link";

export default async function PacienteInicioPage() {
  const supabase = await createClient();

  const { data: patientActivities } = await supabase
    .from("patient_activities")
    .select("id, status, sent_at, due_date, activities ( title, description ), responses ( id )")
    .order("sent_at", { ascending: false });

  const rows = (patientActivities ?? []) as any[];
  const pending = rows.filter((r) => r.status === "pending" || r.status === "in_progress");
  const submitted = rows.filter((r) => r.status === "submitted" || r.status === "viewed" || r.status === "closed");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Olá!</h1>
        <p className="text-sm text-slate-500">Aqui está o resumo das suas atividades.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Pendentes" value={pending.length} />
        <StatCard
          label="Em andamento"
          value={rows.filter((r) => r.status === "in_progress").length}
        />
        <StatCard label="Respondidas" value={submitted.length} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Atividades pendentes</h2>
        {pending.length === 0 ? (
          <EmptyState title="Você está em dia!" description="Nenhuma atividade pendente no momento." />
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <Link
                key={r.id}
                href={`/paciente/atividades/${r.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900">{r.activities?.title}</p>
                  <Badge tone={isOverdue(r.due_date) ? "danger" : statusTone(r.status)}>
                    {isOverdue(r.due_date) ? "Atrasada" : patientActivityStatusLabel[r.status]}
                  </Badge>
                </div>
                {r.activities?.description && (
                  <p className="mt-1 text-sm text-slate-500">{r.activities.description}</p>
                )}
                {r.due_date && (
                  <p className="mt-2 text-xs text-slate-400">Prazo: {formatDate(r.due_date)}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
