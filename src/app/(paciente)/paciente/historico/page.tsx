import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/utils/format";

export default async function PacienteHistoricoPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("patient_activities")
    .select("id, sent_at, completed_at, status, activities ( title )")
    .order("sent_at", { ascending: false });

  const rows = data ?? [];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Histórico</h1>
        <p className="text-sm text-slate-500">Registro cronológico das suas atividades.</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Nenhum histórico ainda" />
      ) : (
        <ol className="space-y-4 border-l border-slate-200 pl-4">
          {rows.map((r: any) => (
            <li key={r.id} className="text-sm">
              <p className="font-medium text-slate-800">{r.activities?.title}</p>
              <p className="text-xs text-slate-400">
                Recebida em {formatDateTime(r.sent_at)}
                {r.completed_at && ` · respondida em ${formatDateTime(r.completed_at)}`}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
