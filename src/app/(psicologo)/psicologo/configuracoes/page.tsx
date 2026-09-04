"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { DEFAULT_THEME, getContrastColor, type ThemeSettings } from "@/lib/utils/theme";

const COLOR_FIELDS: { key: keyof ThemeSettings; label: string; hint: string }[] = [
  { key: "topbar_bg", label: "Cor da barra superior", hint: "A faixa no topo, onde fica sua logo" },
  { key: "button_bg", label: "Cor dos botões", hint: "Botões e item ativo do menu. O texto se ajusta sozinho para ficar legível" },
  { key: "section_bg", label: "Fundo dos cartões", hint: "Normalmente branco - só mude se tiver certeza" },
];

export default function ConfiguracoesPage() {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [professionalName, setProfessionalName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [psychologistId, setPsychologistId] = useState<string | null>(null);

  const [theme, setTheme] = useState<Required<ThemeSettings>>(DEFAULT_THEME);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name, phone")
        .eq("user_id", user.id)
        .single();

      const { data: psychologist } = await supabase
        .from("psychologists")
        .select("id, professional_name, registration_number, theme_json, logo_path")
        .eq("profile_id", profile?.id ?? "")
        .single();

      if (profile) {
        setProfileId(profile.id);
        setName(profile.name);
        setPhone(profile.phone ?? "");
      }
      if (psychologist) {
        setPsychologistId(psychologist.id);
        setProfessionalName(psychologist.professional_name ?? "");
        setRegistrationNumber(psychologist.registration_number ?? "");
        setTheme({ ...DEFAULT_THEME, ...((psychologist.theme_json as ThemeSettings) ?? {}) });
        setLogoPath(psychologist.logo_path ?? null);
        if (psychologist.logo_path) {
          setLogoPreview(supabase.storage.from("branding").getPublicUrl(psychologist.logo_path).data.publicUrl);
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  function updateColor(key: keyof ThemeSettings, value: string) {
    setTheme((prev) => ({ ...prev, [key]: value }));
  }

  async function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !psychologistId) return;

    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
      setError("Use PNG, JPG, WEBP ou SVG para a logo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("A logo deve ter no máximo 5MB.");
      return;
    }

    setError(null);
    setUploadingLogo(true);

    const ext = file.name.split(".").pop();
    const path = `psychologist/${psychologistId}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("branding")
      .upload(path, file, { upsert: true });

    setUploadingLogo(false);

    if (uploadError) {
      setError("Erro ao enviar a logo.");
      return;
    }

    setLogoPath(path);
    // "cache-bust" para o preview atualizar mesmo com o mesmo nome de arquivo
    setLogoPreview(`${supabase.storage.from("branding").getPublicUrl(path).data.publicUrl}?t=${Date.now()}`);

    // Salva na hora, sem depender do botão "Salvar alterações" lá embaixo -
    // é isso que faz a logo aparecer na barra superior para você e seus pacientes.
    await supabase.from("psychologists").update({ logo_path: path }).eq("id", psychologistId);
  }

  async function handleRemoveLogo() {
    if (!logoPath || !psychologistId) return;
    await supabase.storage.from("branding").remove([logoPath]);
    await supabase.from("psychologists").update({ logo_path: null }).eq("id", psychologistId);
    setLogoPath(null);
    setLogoPreview(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (profileId) {
      await supabase.from("profiles").update({ name, phone }).eq("id", profileId);
    }
    if (psychologistId) {
      await supabase
        .from("psychologists")
        .update({
          professional_name: professionalName,
          registration_number: registrationNumber,
          theme_json: theme,
          logo_path: logoPath,
        })
        .eq("id", psychologistId);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <p className="text-sm text-slate-500">Carregando...</p>;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Configurações</h1>
        <p className="text-sm text-slate-500">Informações da sua conta profissional.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <div>
            <label className="text-sm font-medium text-slate-700">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
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
          <div>
            <label className="text-sm font-medium text-slate-700">Nome profissional</label>
            <input
              value={professionalName}
              onChange={(e) => setProfessionalName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Registro profissional (CRP)</label>
            <input
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Aparência</h2>
            <p className="text-xs text-slate-500">
              Personalize a barra superior, os botões e a logo. O resto do app continua
              branco/neutro de propósito, para manter a leitura confortável.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Logo</label>
            <div className="mt-2 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="Logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-[10px] text-slate-400">sem logo</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer text-sm font-medium text-slate-700 underline">
                  {uploadingLogo ? "Enviando..." : "Enviar logo"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoSelect}
                    disabled={uploadingLogo}
                    className="hidden"
                  />
                </label>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-left text-xs text-rose-600 hover:underline"
                  >
                    Remover logo
                  </button>
                )}
                <p className="text-xs text-slate-400">PNG, JPG, WEBP ou SVG, fundo transparente, até 5MB.</p>
                <p className="text-xs text-slate-400">
                  Aparece sempre pequena, na barra superior. Salva automaticamente ao enviar.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {COLOR_FIELDS.map(({ key, label, hint }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400">{hint}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme[key]}
                    onChange={(e) => updateColor(key, e.target.value)}
                    className="h-9 w-9 cursor-pointer rounded border border-slate-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={theme[key]}
                    onChange={(e) => updateColor(key, e.target.value)}
                    className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-mono focus:border-slate-500 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setTheme(DEFAULT_THEME)}
            className="text-xs text-slate-500 underline"
          >
            Restaurar cores padrão
          </button>

          {/* Pré-visualização fiel ao layout real: barra + sidebar + conteúdo,
              não um bloco de cor sólida - assim dá pra ver exatamente onde
              cada cor cai antes de salvar. */}
          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">Pré-visualização</p>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div
                className="flex h-10 items-center gap-2 px-3"
                style={{ backgroundColor: theme.topbar_bg }}
              >
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="Logo" className="h-5 w-auto object-contain" />
                ) : (
                  <div
                    className="h-2 w-16 rounded-full opacity-40"
                    style={{ backgroundColor: getContrastColor(theme.topbar_bg) }}
                  />
                )}
              </div>
              <div className="flex">
                <div className="w-16 space-y-1.5 border-r border-slate-100 bg-white p-2">
                  <div
                    className="h-5 rounded"
                    style={{ backgroundColor: theme.button_bg }}
                  />
                  <div className="h-1.5 w-3/4 rounded bg-slate-100" />
                  <div className="h-1.5 w-3/4 rounded bg-slate-100" />
                </div>
                <div className="flex-1 space-y-2 bg-slate-50 p-3">
                  <div
                    className="space-y-2 rounded-lg p-2 shadow-sm"
                    style={{ backgroundColor: theme.section_bg }}
                  >
                    <div className="h-1.5 w-2/3 rounded bg-slate-200" />
                    <button
                      type="button"
                      className="rounded px-2 py-1 text-[10px] font-medium"
                      style={{ backgroundColor: theme.button_bg, color: getContrastColor(theme.button_bg) }}
                    >
                      Botão
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <Button type="submit" loading={saving}>
          {saved ? "Salvo ✓" : "Salvar alterações"}
        </Button>
      </form>
    </div>
  );
}
