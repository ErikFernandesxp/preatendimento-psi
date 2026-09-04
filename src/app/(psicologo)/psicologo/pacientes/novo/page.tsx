"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Copy, Check, ShieldAlert } from "lucide-react";

export default function NovoPacientePage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", birth_date: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ patientId: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Erro ao cadastrar paciente.");
      setLoading(false);
      return;
    }

    setLoading(false);
    setResult({ patientId: json.patient.id, tempPassword: json.tempPassword });
  }

  async function handleCopy() {
    if (!result) return;
    const text = `E-mail: ${form.email}\nSenha temporária: ${result.tempPassword}\n\nAcesse o site e faça login com esses dados. Você vai criar sua própria senha no primeiro acesso.`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (result) {
    return (
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Paciente cadastrado</h1>
          <p className="text-sm text-slate-500">
            Envie os dados de acesso abaixo para {form.name} (WhatsApp, SMS, o que preferir).
          </p>
        </div>

        <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-2 text-amber-800">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs">
              Essa senha só aparece agora, uma única vez. Copie e envie ao paciente — ele vai
              criar a própria senha assim que fizer login pela primeira vez.
            </p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-white p-3 text-sm">
            <p className="text-slate-500">E-mail</p>
            <p className="font-medium text-slate-900">{form.email}</p>
            <p className="mt-2 text-slate-500">Senha temporária</p>
            <p className="font-mono text-base font-semibold tracking-wide text-slate-900">
              {result.tempPassword}
            </p>
          </div>

          <Button variant="secondary" onClick={handleCopy} className="w-full">
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copiar dados de acesso
              </>
            )}
          </Button>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => router.push(`/psicologo/pacientes/${result.patientId}`)}>
            Ver perfil do paciente
          </Button>
          <Button variant="secondary" onClick={() => router.push("/psicologo/pacientes")}>
            Voltar à lista
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Novo paciente</h1>
        <p className="text-sm text-slate-500">
          O sistema gera uma senha temporária na hora — sem precisar de confirmação por
          e-mail. Você repassa essa senha ao paciente por fora (WhatsApp, SMS etc).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <div>
          <FieldLabel required htmlFor="name">
            Nome completo
          </FieldLabel>
          <input
            id="name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <FieldLabel required htmlFor="email" hint="É com esse e-mail (e a senha temporária) que o paciente vai fazer login.">
            E-mail
          </FieldLabel>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <FieldLabel htmlFor="phone">Telefone</FieldLabel>
          <input
            id="phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <FieldLabel htmlFor="birth_date">Data de nascimento</FieldLabel>
          <input
            id="birth_date"
            type="date"
            value={form.birth_date}
            onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" loading={loading}>
            Cadastrar paciente
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
