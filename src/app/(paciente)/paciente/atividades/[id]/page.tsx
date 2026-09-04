import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils/format";
import { ActivityResponseForm } from "@/components/activities/ActivityResponseForm";
import { ActivityAttachments } from "@/components/activities/ActivityAttachments";

export default async function PacienteAtividadeDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patientActivity } = await supabase
    .from("patient_activities")
    .select(
      `id, patient_id, status, sent_at, due_date,
       activities ( id, title, description, instructions, response_type, response_options, allow_message, allow_attachments, allowed_file_types, max_file_size_mb,
         activity_attachments ( id, file_name, file_path, file_type, file_size ) ),
       responses ( id, text_response, structured_response, is_draft, status,
         response_files ( id, file_name, file_path, file_type ) )`
    )
    .eq("id", id)
    .single();

  if (!patientActivity) notFound();

  // Marca como "visualizada" na primeira abertura (sem sobrescrever
  // um status mais avançado como "submitted" ou "closed").
  if (patientActivity.status === "pending") {
    await supabase
      .from("patient_activities")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", id);
  }

  const activity = patientActivity.activities as any;
  const response = (patientActivity.responses as any)?.[0] ?? null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{activity.title}</h1>
        <div className="mt-1 flex gap-4 text-xs text-slate-400">
          <span>Enviada em {formatDate(patientActivity.sent_at)}</span>
          {patientActivity.due_date && <span>Prazo: {formatDate(patientActivity.due_date)}</span>}
        </div>
      </div>

      {activity.description && (
        <p className="text-sm text-slate-600">{activity.description}</p>
      )}

      {activity.instructions && (
        <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
          {activity.instructions}
        </div>
      )}

      <ActivityAttachments
        activityId={activity.id}
        initialAttachments={activity.activity_attachments ?? []}
        readOnly
        title="Material do seu psicólogo"
      />

      <ActivityResponseForm
        patientActivityId={patientActivity.id}
        patientId={patientActivity.patient_id}
        responseId={response?.id ?? null}
        responseType={activity.response_type}
        responseOptions={activity.response_options}
        allowMessage={activity.allow_message}
        allowAttachments={activity.allow_attachments}
        allowedFileTypes={activity.allowed_file_types}
        maxFileSizeMb={activity.max_file_size_mb}
        initialTextResponse={response?.text_response ?? null}
        initialStructuredResponse={response?.structured_response ?? null}
        initialFiles={response?.response_files ?? []}
        alreadySubmitted={response?.status === "submitted" || response?.status === "viewed" || response?.status === "closed"}
      />
    </div>
  );
}
