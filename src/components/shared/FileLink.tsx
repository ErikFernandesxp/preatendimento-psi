"use client";

import { useState } from "react";
import { FileText, ImageIcon, Video, Download, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

interface FileLinkProps {
  bucket: string;
  path: string;
  name: string;
  type: string;
  onDelete?: () => void;
  className?: string;
}

function iconFor(type: string) {
  if (type.startsWith("image/")) return ImageIcon;
  if (type.startsWith("video/")) return Video;
  return FileText;
}

/**
 * Chip clicável para um arquivo em um bucket privado do Supabase Storage.
 * A URL assinada só é gerada na hora do clique (não fica em cache),
 * e abre em uma nova aba - para imagem/vídeo isso já mostra o preview
 * nativo do navegador; para o resto, inicia o download.
 */
export function FileLink({ bucket, path, name, type, onDelete, className }: FileLinkProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const Icon = iconFor(type);

  async function handleOpen() {
    setLoading(true);
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    setLoading(false);
    if (error || !data) return;
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-[var(--section-bg,#fff)] px-3 py-2 text-sm",
        className
      )}
    >
      <button
        type="button"
        onClick={handleOpen}
        disabled={loading}
        className="flex min-w-0 flex-1 items-center gap-2 text-left text-slate-700 hover:underline"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />
        ) : (
          <Icon className="h-4 w-4 shrink-0 text-slate-400" />
        )}
        <span className="truncate">{name}</span>
        <Download className="h-3.5 w-3.5 shrink-0 text-slate-300" />
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Remover arquivo"
          className="shrink-0 text-slate-400 hover:text-rose-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
