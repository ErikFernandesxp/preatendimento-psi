"use client";

import { useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FileLink } from "@/components/shared/FileLink";

export interface ActivityAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
}

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_SIZE_MB = 50; // teto do plano Free do Supabase por arquivo

export function ActivityAttachments({
  activityId,
  initialAttachments,
  readOnly = false,
  title = "Anexos",
  description,
}: {
  activityId: string;
  initialAttachments: ActivityAttachment[];
  readOnly?: boolean;
  title?: string;
  description?: string;
}) {
  const supabase = createClient();
  const [attachments, setAttachments] = useState<ActivityAttachment[]>(initialAttachments);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    setError(null);
    setUploading(true);

    for (const file of Array.from(selected)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(`Tipo de arquivo não permitido: ${file.name}`);
        continue;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`Arquivo muito grande (máx. ${MAX_SIZE_MB}MB): ${file.name}`);
        continue;
      }

      const path = `activity/${activityId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("activity-materials")
        .upload(path, file);

      if (uploadError) {
        setError(`Erro ao enviar ${file.name}.`);
        continue;
      }

      const { data: row, error: rowError } = await supabase
        .from("activity_attachments")
        .insert({
          activity_id: activityId,
          file_path: path,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();

      if (!rowError && row) {
        setAttachments((prev) => [...prev, row]);
      }
    }

    setUploading(false);
    e.target.value = "";
  }

  async function handleDelete(attachment: ActivityAttachment) {
    await supabase.storage.from("activity-materials").remove([attachment.file_path]);
    await supabase.from("activity_attachments").delete().eq("id", attachment.id);
    setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
  }

  if (readOnly && attachments.length === 0) return null;

  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{title}</label>
      {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}

      <div className="mt-2 space-y-2">
        {attachments.map((a) => (
          <FileLink
            key={a.id}
            bucket="activity-materials"
            path={a.file_path}
            name={a.file_name}
            type={a.file_type}
            onDelete={readOnly ? undefined : () => handleDelete(a)}
          />
        ))}

        {!readOnly && (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 hover:bg-slate-50">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Enviando..." : "Anexar PDF, foto, vídeo..."}
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
              accept={ACCEPTED_TYPES.join(",")}
            />
          </label>
        )}
      </div>

      {!readOnly && (
        <p className="mt-1 text-xs text-slate-400">Até {MAX_SIZE_MB}MB por arquivo.</p>
      )}

      {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
