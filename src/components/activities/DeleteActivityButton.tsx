"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function DeleteActivityButton({
  activityId,
  activityTitle,
  alreadySent,
}: {
  activityId: string;
  activityTitle: string;
  alreadySent: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    const { error: deleteError } = await supabase.from("activities").delete().eq("id", activityId);

    if (deleteError) {
      setError("Erro ao excluir. Tente novamente.");
      setDeleting(false);
      return;
    }

    setDeleting(false);
    setConfirmOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setConfirmOpen(true)}
        aria-label="Excluir atividade"
        className="text-slate-400 hover:text-rose-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <p className="font-medium text-slate-900">Excluir &quot;{activityTitle}&quot;?</p>
            <p className="mt-1 text-sm text-slate-500">
              {alreadySent
                ? "Esta atividade já foi enviada a pacientes. Excluir também remove todas as cópias enviadas e as respostas que os pacientes já deram, para todos eles. Essa ação não pode ser desfeita."
                : "Essa ação não pode ser desfeita."}
            </p>
            {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
