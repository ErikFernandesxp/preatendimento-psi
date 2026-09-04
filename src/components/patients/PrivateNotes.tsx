"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils/format";
import { Trash2, Pencil } from "lucide-react";

interface Note {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function PrivateNotes({
  patientId,
  psychologistId,
  initialNotes,
}: {
  patientId: string;
  psychologistId: string;
  initialNotes: Note[];
}) {
  const supabase = createClient();
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!draft.trim()) return;
    setSaving(true);

    if (editingId) {
      const { data, error } = await supabase
        .from("psychologist_notes")
        .update({ content: draft })
        .eq("id", editingId)
        .select()
        .single();
      if (!error && data) {
        setNotes((prev) => prev.map((n) => (n.id === editingId ? data : n)));
      }
    } else {
      const { data, error } = await supabase
        .from("psychologist_notes")
        .insert({ patient_id: patientId, psychologist_id: psychologistId, content: draft })
        .select()
        .single();
      if (!error && data) {
        setNotes((prev) => [data, ...prev]);
      }
    }

    setDraft("");
    setEditingId(null);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("psychologist_notes").delete().eq("id", id);
    if (!error) setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
        Esta área é privada e nunca é exibida ao paciente.
      </div>

      <div className="space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Adicionar nota clínica..."
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <div className="flex gap-2">
          <Button onClick={handleSave} loading={saving}>
            {editingId ? "Salvar edição" : "Adicionar nota"}
          </Button>
          {editingId && (
            <Button
              variant="secondary"
              onClick={() => {
                setEditingId(null);
                setDraft("");
              }}
            >
              Cancelar
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {notes.length === 0 && (
          <p className="text-sm text-slate-400">Nenhuma anotação registrada ainda.</p>
        )}
        {notes.map((note) => (
          <div key={note.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="whitespace-pre-wrap text-sm text-slate-700">{note.content}</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-slate-400">{formatDateTime(note.created_at)}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingId(note.id);
                    setDraft(note.content);
                  }}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
