// Caminho no projeto: src/components/activities/ActivityResponseForm.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Upload, Paperclip, CheckCircle2 } from "lucide-react";
import { FileLink } from "@/components/shared/FileLink";
import { buildStorageObjectPath, describeStorageError } from "@/lib/utils/storage";
import type { ActivityResponseType } from "@/types/database.types";

interface ExistingFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
}

/**
 * O tipo de resposta (Sim/Não, Escala, Múltipla escolha...) define o
 * widget "principal" da atividade — mas nunca trava o paciente: uma
 * mensagem de texto e o envio de anexos ficam SEMPRE disponíveis e
 * SEMPRE opcionais, em qualquer tipo. O botão de enviar libera assim
 * que o paciente preencheu qualquer uma das opções (o widget
 * principal, uma mensagem, ou um arquivo) — nunca as três ao mesmo
 * tempo.
 */
export function ActivityResponseForm({
  patientActivityId,
  patientId,
  responseId: initialResponseId,
  responseType,
  responseOptions,
  allowMessage,
  allowAttachments,
  allowedFileTypes,
  maxFileSizeMb,
  initialTextResponse,
  initialStructuredResponse,
  initialFiles,
  alreadySubmitted,
}: {
  patientActivityId: string;
  patientId: string;
  responseId: string | null;
  responseType: ActivityResponseType;
  responseOptions: any;
  allowMessage?: boolean;
  allowAttachments?: boolean;
  allowedFileTypes: string[] | null;
  maxFileSizeMb?: number | null;
  initialTextResponse: string | null;
  initialStructuredResponse: any;
  initialFiles: ExistingFile[];
  alreadySubmitted: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const sizeLimitMb = maxFileSizeMb ?? 10;

  const [responseId, setResponseId] = useState(initialResponseId);
  const [textResponse, setTextResponse] = useState(initialTextResponse ?? "");
  const [structuredValue, setStructuredValue] = useState<any>(
    initialStructuredResponse?.value ?? (responseType === "objective_multiple_choice" ? [] : "")
  );
  const [files, setFiles] = useState<ExistingFile[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(alreadySubmitted);

  const isPrimaryText = responseType === "free_text" || responseType === "diary";
  const isPrimaryUpload = responseType === "image_upload" || responseType === "file_upload";
  const showChoices =
    responseType === "objective_multiple_choice" || responseType === "objective_single_choice";
  const showScale = responseType === "objective_scale";
  const showYesNo = responseType === "objective_yes_no";
  const hasStructuredWidget = showYesNo || showScale || showChoices;

  async function ensureResponse(): Promise<string | null> {
    if (responseId) return responseId;

    const { data, error: insertError } = await supabase
      .from("responses")
      .insert({ patient_activity_id: patientActivityId, status: "in_progress" })
      .select()
      .single();

    if (insertError || !data) {
      setError("Não foi possível iniciar a resposta.");
      return null;
    }

    await supabase
      .from("patient_activities")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", patientActivityId)
      .is("started_at", null);

    setResponseId(data.id);
    return data.id;
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    setError(null);
    setUploading(true);

    const rId = await ensureResponse();
    if (!rId) {
      setUploading(false);
      return;
    }

    const fileErrors: string[] = [];

    for (const file of Array.from(selected)) {
      if (allowedFileTypes && allowedFileTypes.length > 0 && !allowedFileTypes.includes(file.type)) {
        fileErrors.push(`Tipo de arquivo não permitido: ${file.name}`);
        continue;
      }
      if (file.size > sizeLimitMb * 1024 * 1024) {
        fileErrors.push(`Arquivo muito grande (máx. ${sizeLimitMb}MB): ${file.name}`);
        continue;
      }

      const path = buildStorageObjectPath(
        `patient/${patientId}/activities/${patientActivityId}`,
        file.name
      );

      const { error: uploadError } = await supabase.storage
        .from("patient-files")
        .upload(path, file);

      if (uploadError) {
        fileErrors.push(describeStorageError(file.name, uploadError));
        continue;
      }

      const { data: fileRow, error: fileRowError } = await supabase
        .from("response_files")
        .insert({
          response_id: rId,
          file_path: path,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();

      if (fileRowError || !fileRow) {
        // Evita deixar um arquivo "órfão" no Storage se o registro no
        // banco falhar.
        await supabase.storage.from("patient-files").remove([path]);
        fileErrors.push(`Não foi possível registrar "${file.name}" depois do envio. Tente novamente.`);
        continue;
      }

      setFiles((prev) => [...prev, fileRow]);
    }

    if (fileErrors.length > 0) setError(fileErrors.join(" "));
    setUploading(false);
    e.target.value = "";
  }

  async function handleDeleteFile(file: ExistingFile) {
    await supabase.storage.from("patient-files").remove([file.file_path]);
    await supabase.from("response_files").delete().eq("id", file.id);
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
  }

  function buildPayload() {
    return {
      text_response: textResponse.trim() ? textResponse : null,
      structured_response: hasStructuredWidget ? { value: structuredValue } : null,
    };
  }

  async function handleSaveDraft() {
    setSaving(true);
    setError(null);
    const rId = await ensureResponse();
    if (!rId) {
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("responses")
      .update({ ...buildPayload(), is_draft: true })
      .eq("id", rId);

    if (updateError) setError("Erro ao salvar rascunho.");
    setSaving(false);
  }

  async function handleConfirmSubmit() {
    setSubmitting(true);
    setError(null);
    const rId = await ensureResponse();
    if (!rId) {
      setSubmitting(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("responses")
      .update({
        ...buildPayload(),
        is_draft: false,
        submitted_at: new Date().toISOString(),
        status: "submitted",
      })
      .eq("id", rId);

    if (updateError) {
      setError("Erro ao enviar a resposta.");
      setSubmitting(false);
      return;
    }

    await supabase
      .from("patient_activities")
      .update({ status: "submitted", completed_at: new Date().toISOString() })
      .eq("id", patientActivityId);

    setSubmitting(false);
    setConfirmOpen(false);
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
        <p className="mt-2 font-medium text-emerald-800">Resposta enviada com sucesso.</p>
        <p className="mt-1 text-sm text-emerald-700">
          Seu psicólogo poderá revisar isso antes da próxima consulta.
        </p>
      </div>
    );
  }

  const hasStructuredValue = hasStructuredWidget
    ? Array.isArray(structuredValue)
      ? structuredValue.length > 0
      : structuredValue !== "" && structuredValue !== undefined
    : false;
  const hasText = textResponse.trim().length > 0;
  const hasFiles = files.length > 0;
  const canSubmit = hasStructuredValue || hasText || hasFiles;

  return (
    <div className="space-y-6">
      {isPrimaryText && (
        <div>
          <label className="text-sm font-semibold text-slate-800">Sua resposta</label>
          <textarea
            value={textResponse}
            onChange={(e) => setTextResponse(e.target.value)}
            rows={6}
            placeholder="Escreva sua resposta aqui..."
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
      )}

      {showYesNo && (
        <div>
          <label className="text-sm font-semibold text-slate-800">Sua resposta</label>
          <div className="mt-1.5 flex gap-3">
            {["Sim", "Não"].map((opt) => (
              <button
                key={opt}
                onClick={() => setStructuredValue(opt)}
                className={`rounded-lg border px-5 py-2 text-sm font-medium transition-colors ${
                  structuredValue === opt
                    ? "border-[var(--button-bg,#0f172a)] bg-[var(--button-bg,#0f172a)] text-[var(--button-fg,#fff)]"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {showScale && (
        <div>
          <label className="text-sm font-semibold text-slate-800">Sua resposta</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {Array.from(
              { length: (responseOptions?.max ?? 5) - (responseOptions?.min ?? 1) + 1 },
              (_, i) => (responseOptions?.min ?? 1) + i
            ).map((n) => (
              <button
                key={n}
                onClick={() => setStructuredValue(n)}
                className={`h-10 w-10 rounded-lg border text-sm font-medium transition-colors ${
                  structuredValue === n
                    ? "border-[var(--button-bg,#0f172a)] bg-[var(--button-bg,#0f172a)] text-[var(--button-fg,#fff)]"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {showChoices && (
        <div>
          <label className="text-sm font-semibold text-slate-800">Sua resposta</label>
          <div className="mt-1.5 space-y-2">
            {(responseOptions?.options ?? []).map((opt: string) => {
              const isMulti = responseType === "objective_multiple_choice";
              const checked = isMulti
                ? (structuredValue as string[]).includes(opt)
                : structuredValue === opt;

              return (
                <label
                  key={opt}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <input
                    type={isMulti ? "checkbox" : "radio"}
                    checked={checked}
                    onChange={() => {
                      if (isMulti) {
                        setStructuredValue((prev: string[]) =>
                          checked ? prev.filter((v) => v !== opt) : [...prev, opt]
                        );
                      } else {
                        setStructuredValue(opt);
                      }
                    }}
                  />
                  {opt}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Mensagem: sempre opcional; disponível quando a atividade permite. */}
      {!isPrimaryText && allowMessage !== false && (
        <div>
          <label className="text-sm font-medium text-slate-600">Mensagem (opcional)</label>
          <textarea
            value={textResponse}
            onChange={(e) => setTextResponse(e.target.value)}
            rows={3}
            placeholder="Quer adicionar alguma observação? (opcional)"
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
      )}

      {/* Anexos: sempre opcional; disponível quando a atividade permite,
          ou sempre que o tipo principal já é upload de imagem/arquivo. */}
      {(isPrimaryUpload || allowAttachments !== false) && (
        <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
          <Paperclip className="h-3.5 w-3.5" />
          Anexos {!isPrimaryUpload && "(opcional)"}
        </label>
        <div className="mt-1.5 space-y-2">
          {files.map((f) => (
            <FileLink
              key={f.id}
              bucket="patient-files"
              path={f.file_path}
              name={f.file_name}
              type={f.file_type}
              onDelete={() => handleDeleteFile(f)}
            />
          ))}

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 hover:bg-slate-50">
            <Upload className="h-4 w-4" />
            {uploading ? "Enviando..." : "Selecionar arquivo(s)"}
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
              accept={allowedFileTypes?.join(",")}
            />
          </label>
          <p className="text-xs text-slate-400">Até {sizeLimitMb}MB por arquivo.</p>
        </div>
      </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex items-center gap-3 border-t border-slate-100 pt-5">
        <Button variant="secondary" onClick={handleSaveDraft} loading={saving}>
          Salvar rascunho
        </Button>
        <Button onClick={() => setConfirmOpen(true)} disabled={!canSubmit}>
          Enviar resposta
        </Button>
        {!canSubmit && (
          <span className="text-xs text-slate-400">
            Responda, escreva uma mensagem ou anexe um arquivo para poder enviar.
          </span>
        )}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <p className="font-medium text-slate-900">
              Tem certeza que deseja enviar esta resposta?
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Após o envio, você não poderá mais editá-la.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmSubmit} loading={submitting}>
                Confirmar envio
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}