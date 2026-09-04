import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge, statusTone } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { PrivateNotes } from "@/components/patients/PrivateNotes";
import { DeletePatientButton } from "@/components/patients/DeletePatientButton";
import { FileLink } from "@/components/shared/FileLink";
import {
  formatDate,
  formatDateTime,
  patientActivityStatusLabel,
  patientStatusLabel,
} from "@/lib/utils/format";

export default async function PacienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, status, birth_date, admin_notes, created_at, psychologist_id, profiles ( name, email, phone, avatar_url )")
    .eq("id", id)
    .single();

  if (!patient) notFound();

  const [{ data: patientActivities }, { data: notes }] = await Promise.all([
    supabase
      .from("patient_activities")
      .select(
        `id, status, sent_at, due_date, completed_at,
         activities ( title, response_type ),
         responses ( id, text_response, submitted_at, is_draft,
           response_files ( id, file_name, file_type, file_path, created_at ) )`
      )
      .eq("patient_id", id)
      .order("sent_at", { ascending: false }),
    supabase
      .from("psychologist_notes")
      .select("id, content, created_at, updated_at")
      .eq("patient_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const activities = (patientActivities ?? []) as any[];
  const pending = activities.filter((a) => a.status === "pending" || a.status === "in_progress");
  const recentResponses = activities.filter((a) => a.responses?.[0]?.submitted_at).slice(0, 5);
  const allFiles = activities.flatMap((a) => a.responses?.[0]?.response_files ?? []);

  const profile = patient.profiles as any;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{profile?.name}</h1>
          <p className="text-sm text-slate-500">{profile?.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={statusTone(patient.status)}>{patientStatusLabel[patient.status]}</Badge>
          <DeletePatientButton patientId={patient.id} patientName={profile?.name ?? "este paciente"} />
        </div>
      </div>

      <Tabs
        tabs={[
          {
            label: "Resumo",
            content: (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-semibold text-slate-900">Informações básicas</h3>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Telefone</dt>
                      <dd className="text-slate-900">{profile?.phone ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Nascimento</dt>
                      <dd className="text-slate-900">
                        {patient.birth_date ? formatDate(patient.birth_date) : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Cadastrado em</dt>
                      <dd className="text-slate-900">{formatDate(patient.created_at)}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Atividades pendentes ({pending.length})
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm">
                    {pending.length === 0 && <p className="text-slate-400">Nenhuma pendência.</p>}
                    {pending.map((a) => (
                      <li key={a.id} className="flex justify-between">
                        <span className="text-slate-700">{a.activities?.title}</span>
                        <Badge tone={statusTone(a.status)}>
                          {patientActivityStatusLabel[a.status]}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 md:col-span-2">
                  <h3 className="text-sm font-semibold text-slate-900">Últimas respostas</h3>
                  {recentResponses.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-400">Nenhuma resposta enviada ainda.</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-slate-100">
                      {recentResponses.map((a) => (
                        <li key={a.id} className="py-2 text-sm">
                          <p className="font-medium text-slate-800">{a.activities?.title}</p>
                          <p className="text-xs text-slate-400">
                            Enviada em {formatDateTime(a.responses[0].submitted_at)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ),
          },
          {
            label: "Atividades",
            content:
              activities.length === 0 ? (
                <EmptyState title="Nenhuma atividade enviada a este paciente" />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Atividade</th>
                        <th className="px-4 py-3">Enviada em</th>
                        <th className="px-4 py-3">Prazo</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Resposta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activities.map((a) => (
                        <tr key={a.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {a.activities?.title}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{formatDate(a.sent_at)}</td>
                          <td className="px-4 py-3 text-slate-500">
                            {a.due_date ? formatDate(a.due_date) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={statusTone(a.status)}>
                              {patientActivityStatusLabel[a.status]}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 max-w-xs truncate text-slate-500">
                            {a.responses?.[0]?.text_response ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ),
          },
          {
            label: "Arquivos",
            content:
              allFiles.length === 0 ? (
                <EmptyState title="Nenhum arquivo enviado por este paciente" />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {allFiles.map((f: any) => (
                    <FileLink
                      key={f.id}
                      bucket="patient-files"
                      path={f.file_path}
                      name={f.file_name}
                      type={f.file_type}
                    />
                  ))}
                </div>
              ),
          },
          {
            label: "Histórico",
            content:
              activities.length === 0 ? (
                <EmptyState title="Sem histórico de interações ainda" />
              ) : (
                <ol className="space-y-4 border-l border-slate-200 pl-4">
                  {activities.map((a) => (
                    <li key={a.id} className="text-sm">
                      <p className="font-medium text-slate-800">{a.activities?.title}</p>
                      <p className="text-xs text-slate-400">
                        Enviada em {formatDateTime(a.sent_at)}
                        {a.completed_at && ` · concluída em ${formatDateTime(a.completed_at)}`}
                      </p>
                    </li>
                  ))}
                </ol>
              ),
          },
          {
            label: "Anotações privadas",
            content: (
              <PrivateNotes
                patientId={patient.id}
                psychologistId={patient.psychologist_id}
                initialNotes={notes ?? []}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
