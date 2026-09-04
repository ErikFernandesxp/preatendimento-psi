"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Trash2 } from "lucide-react";

interface Point {
  id: string;
  content: string;
  completed: boolean;
}

export function ConsultationPoints({
  patientId,
  psychologistId,
  initialPoints,
}: {
  patientId: string;
  psychologistId: string;
  initialPoints: Point[];
}) {
  const supabase = createClient();
  const [points, setPoints] = useState(initialPoints);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!draft.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("consultation_points")
      .insert({ patient_id: patientId, psychologist_id: psychologistId, content: draft })
      .select()
      .single();
    if (!error && data) {
      setPoints((prev) => [data, ...prev]);
      setDraft("");
    }
    setSaving(false);
  }

  async function toggleCompleted(id: string, completed: boolean) {
    const { error } = await supabase
      .from("consultation_points")
      .update({ completed: !completed })
      .eq("id", id);
    if (!error) {
      setPoints((prev) => prev.map((p) => (p.id === id ? { ...p, completed: !completed } : p)));
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("consultation_points").delete().eq("id", id);
    if (!error) setPoints((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">Pontos para consulta</h3>
      <p className="text-xs text-slate-400">Itens privados que você quer abordar na sessão.</p>

      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Adicionar ponto..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
        />
        <Button variant="secondary" onClick={handleAdd} loading={saving}>
          Adicionar
        </Button>
      </div>

      <ul className="mt-4 space-y-2">
        {points.length === 0 && <p className="text-sm text-slate-400">Nenhum ponto adicionado.</p>}
        {points.map((p) => (
          <li key={p.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={p.completed}
              onChange={() => toggleCompleted(p.id, p.completed)}
            />
            <span className={p.completed ? "flex-1 text-slate-400 line-through" : "flex-1 text-slate-700"}>
              {p.content}
            </span>
            <button onClick={() => handleDelete(p.id)} className="text-slate-400 hover:text-rose-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
