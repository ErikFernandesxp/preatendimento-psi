import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/ui/Card";
import { Badge, statusTone } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import {
  formatDate,
  patientActivityStatusLabel,
} from "@/lib/utils/format";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: authProfile } = await supabase
    .from("psychologists")
    .select("id")
    .single();

  const psychologistId = authProfile?.id;

  const [{ count: totalPatients }, { count: activePatients }, patientActivities] =
    await Promise.all([
      supabase
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("psychologist_id", psychologistId ?? ""),
      supabase
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("psychologist_id", psychologistId ?? "")
        .eq("status", "active"),
      supabase
        .from("patient_activities")
        .select(
          `id, status, sent_at, due_date,
           activities ( title ),
           patients ( id, profiles ( name ) ),
           responses ( submitted_at )`
        )
        .order("sent_at", { ascending: false })
        .limit(8),
    ]);

  const rows = (patientActivities.data ?? []) as any[];
  const pendingCount = rows.filter((r) => r.status === "pending" || r.status === "in_progress").length;
  const submittedCount = rows.filter((r) => r.status === "submitted" || r.status === "viewed").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Visão geral do seu atendimento.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total de pacientes" value={totalPatients ?? 0} />
        <StatCard label="Pacientes ativos" value={activePatients ?? 0} />
        <StatCard label="Atividades pendentes" value={pendingCount} />
        <StatCard label="Atividades respondidas" value={submittedCount} />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Atividades recentes</h2>
          <LinkButton href="/psicologo/atividades/nova" variant="secondary">
            + Nova atividade
          </LinkButton>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="Nenhuma atividade enviada ainda"
            description="Crie uma atividade e envie para um paciente para começar."
            action={
              <LinkButton href="/psicologo/atividades/nova">+ Nova atividade</LinkButton>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">Atividade</th>
                  <th className="px-4 py-3">Enviada em</th>
                  <th className="px-4 py-3">Prazo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {row.patients?.profiles?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.activities?.title ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(row.sent_at)}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {row.due_date ? formatDate(row.due_date) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(row.status)}>
                        {patientActivityStatusLabel[row.status] ?? row.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/psicologo/pacientes/${row.patients?.id}`}
                        className="text-sm font-medium text-slate-900 hover:underline"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
