import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

export default async function PreAtendimentoPage() {
  const supabase = await createClient();

  const { data: patients } = await supabase
    .from("patients")
    .select(
      `id, status, profiles ( name, email ),
       patient_activities ( id, status )`
    )
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const rows = (patients ?? []) as any[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Pré-atendimento</h1>
        <p className="text-sm text-slate-500">
          Selecione um paciente para revisar antes da consulta.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Nenhum paciente ativo" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((p) => {
            const pending = p.patient_activities.filter(
              (a: any) => a.status === "pending" || a.status === "in_progress"
            ).length;
            const submitted = p.patient_activities.filter(
              (a: any) => a.status === "submitted" || a.status === "viewed"
            ).length;

            return (
              <Link
                key={p.id}
                href={`/psicologo/pre-atendimento/${p.id}`}
                className="rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md"
              >
                <h3 className="font-semibold text-slate-900">{p.profiles?.name}</h3>
                <p className="text-sm text-slate-500">{p.profiles?.email}</p>
                <div className="mt-3 flex gap-2">
                  <Badge tone="neutral">{pending} pendente(s)</Badge>
                  <Badge tone="success">{submitted} respondida(s)</Badge>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
