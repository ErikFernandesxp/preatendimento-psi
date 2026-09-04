import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/Button";
import { Badge, statusTone } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, patientStatusLabel } from "@/lib/utils/format";
import Link from "next/link";

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("patients")
    .select("id, status, created_at, profiles ( name, email, phone )")
    .order("created_at", { ascending: false });

  if (status === "active" || status === "inactive") {
    query = query.eq("status", status);
  }

  const { data } = await query;
  let patients = (data ?? []) as any[];

  if (q) {
    const term = q.toLowerCase();
    patients = patients.filter(
      (p) =>
        p.profiles?.name?.toLowerCase().includes(term) ||
        p.profiles?.email?.toLowerCase().includes(term) ||
        p.profiles?.phone?.toLowerCase().includes(term)
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Pacientes</h1>
          <p className="text-sm text-slate-500">Gerencie seus pacientes vinculados.</p>
        </div>
        <LinkButton href="/psicologo/pacientes/novo">+ Novo paciente</LinkButton>
      </div>

      <form className="flex flex-wrap gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome, e-mail ou telefone"
          className="flex-1 min-w-[220px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Filtrar
        </button>
      </form>

      {patients.length === 0 ? (
        <EmptyState
          title="Nenhum paciente encontrado"
          description="Cadastre um novo paciente ou ajuste os filtros de busca."
          action={<LinkButton href="/psicologo/pacientes/novo">+ Novo paciente</LinkButton>}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Cadastrado em</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{p.profiles?.name}</td>
                  <td className="px-4 py-3 text-slate-500">{p.profiles?.email}</td>
                  <td className="px-4 py-3 text-slate-500">{p.profiles?.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(p.status)}>{patientStatusLabel[p.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/psicologo/pacientes/${p.id}`}
                      className="text-sm font-medium text-slate-900 hover:underline"
                    >
                      Ver perfil
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
