"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function SendActivityButton({
  activityId,
  patients,
}: {
  activityId: string;
  patients: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [patientId, setPatientId] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!patientId) return;
    setSending(true);

    const res = await fetch("/api/activities/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activity_id: activityId, patient_id: patientId }),
    });

    setSending(false);

    if (res.ok) {
      setSent(true);
      router.refresh();
      setTimeout(() => setSent(false), 2000);
    }
  }

  if (patients.length === 0) {
    return <p className="mt-4 text-xs text-slate-400">Cadastre um paciente ativo para enviar.</p>;
  }

  return (
    <div className="mt-4 flex gap-2">
      <select
        value={patientId}
        onChange={(e) => setPatientId(e.target.value)}
        className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
      >
        <option value="">Selecionar paciente...</option>
        {patients.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <Button variant="secondary" onClick={handleSend} loading={sending} disabled={!patientId}>
        {sent ? "Enviada ✓" : "Enviar"}
      </Button>
    </div>
  );
}
