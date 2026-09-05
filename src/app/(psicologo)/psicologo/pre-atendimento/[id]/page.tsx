// Caminho no projeto: src/app/(psicologo)/psicologo/pre-atendimento/[id]/page.tsx

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatDateTime, formatStructuredValue } from "@/lib/utils/format";
import { ConsultationPoints } from "@/components/pre-atendimento/ConsultationPoints";
import { ResponseFlagPicker } from "@/components/pre-atendimento/ResponseFlagPicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { patientActivityStatusLabel } from "@/lib/utils/format";
import { Badge, statusTone } from "@/components/ui/Badge";
import { FileLink } from "@/components/shared/FileLink";

export default async function PreAtendimentoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, psychologist_id, profiles ( name, email )")
    .eq("id", id)
    .single();

  if (!patient) notFound();

  const [{ data: activities }, { data: points }] = await Promise.all([
    supabase
      .from("patient_activities")
      .select(
        `id, status, sent_at,
         activities ( title ),
         responses ( id, text_response, structured_response, is_draft, submitted_at,
           response_flags ( flag ),
           response_files ( id, file_name, file_path, file_type ) )`
      )
      .eq("patient_id", id)
      .order("sent_at", { ascending: false })
      .limit(10),
    supabase
      .from("consultation_points")
      .select("id, content, completed")
      .eq("patient_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const rows = (activities ?? []) as any[];

  // Antes, isso só considerava a resposta se `submitted_at` estivesse
  // preenchido — então texto, resposta objetiva (structured_response) e
  // arquivos anexados de uma resposta ainda em rascunho (ou que não
  // completou o fluxo de "Confirmar envio") nunca apareciam aqui, mesmo
  // o paciente já tendo escrito ou anexado algo. Agora mostramos
  // qualquer resposta que já tenha algum conteúdo, e sinalizamos com o
  // badge "Rascunho" quando ainda não foi formalmente enviada.
  const withResponses = rows.filter((r) => {
    const resp = r.responses?.[0];
    if (!resp) return false;
    const hasText = !!resp.text_response;
    const structuredText = formatStructuredValue(resp.structured_response?.value);
    const hasFiles = (resp.response_files?.length ?? 0) > 0;
    return hasText || !!structuredText || hasFiles;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Pré-atendimento — {patient.profiles?.[0]?.name ?? (patient.profiles as any)?.name}
        </h1>
        <p className="text-sm text-slate-500">Resumo antes da consulta.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Atividades recentes</h2>
            {rows.length === 0 ? (
              <EmptyState title="Nenhuma atividade enviada ainda" />
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-slate-700">{r.activities?.title}</span>
                    <Badge tone={statusTone(r.status)}>
                      {patientActivityStatusLabel[r.status] ?? r.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Últimas respostas</h2>
            {withResponses.length === 0 ? (
              <EmptyState title="Nenhuma resposta enviada ainda" />
            ) : (
              <div className="space-y-3">
                {withResponses.map((r) => {
                  const response = r.responses[0];
                  const structuredText = formatStructuredValue(response.structured_response?.value);
                  const files = response.response_files ?? [];

                  return (
                    <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-900">{r.activities?.title}</p>
                        {response.submitted_at ? (
                          <p className="text-xs text-slate-400">
                            {formatDateTime(response.submitted_at)}
                          </p>
                        ) : (
                          <Badge tone="warning">Rascunho</Badge>
                        )}
                      </div>

                      {structuredText && (
                        <p className="mt-2 text-sm font-medium text-slate-800">{structuredText}</p>
                      )}

                      {response.text_response && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                          {response.text_response}
                        </p>
                      )}

                      {files.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {files.map((f: any) => (
                            <FileLink
                              key={f.id}
                              bucket="patient-files"
                              path={f.file_path}
                              name={f.file_name}
                              type={f.file_type}
                            />
                          ))}
                        </div>
                      )}

                      <div className="mt-3">
                        <ResponseFlagPicker
                          responseId={response.id}
                          psychologistId={patient.psychologist_id}
                          initialFlags={(response.response_flags ?? []).map((f: any) => f.flag)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div>
          <ConsultationPoints
            patientId={patient.id}
            psychologistId={patient.psychologist_id}
            initialPoints={points ?? []}
          />
        </div>
      </div>
    </div>
  );
}