"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export default function PacientePerfilPage() {
  const supabase = createClient();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [psychologistName, setPsychologistName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name, phone, email")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setProfileId(profile.id);
        setName(profile.name);
        setPhone(profile.phone ?? "");
        setEmail(profile.email);
      }

      const { data: patient } = await supabase
        .from("patients")
        .select("psychologists ( professional_name, profile_id )")
        .eq("profile_id", profile?.id ?? "")
        .single();

      const psych = patient?.psychologists as any;
      if (psych) {
        setPsychologistName(psych.professional_name);
      }

      setLoading(false);
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profileId) return;
    setSaving(true);
    await supabase.from("profiles").update({ name, phone }).eq("id", profileId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <p className="text-sm text-slate-500">Carregando...</p>;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Meu perfil</h1>
        {psychologistName && (
          <p className="text-sm text-slate-500">Acompanhado(a) por {psychologistName}</p>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label className="text-sm font-medium text-slate-700">Nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">E-mail</label>
          <input
            value={email}
            disabled
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Telefone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        <Button type="submit" loading={saving}>
          {saved ? "Salvo ✓" : "Salvar alterações"}
        </Button>
      </form>
    </div>
  );
}
