import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";

export default async function PacienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, must_change_password")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "patient") redirect("/psicologo/dashboard");

  // Conta criada pelo psicólogo com senha temporária: força a troca
  // antes de liberar qualquer outra tela.
  if (profile.must_change_password) redirect("/definir-senha-inicial");

  // O paciente herda a marca (cores + logo) do próprio psicólogo, já
  // que cada paciente pertence a um único psicólogo.
  const { data: patient } = await supabase
    .from("patients")
    .select("psychologists ( professional_name, theme_json, logo_path )")
    .eq("profile_id", profile.id)
    .single();

  const psychologist = patient?.psychologists as any;

  const logoUrl = psychologist?.logo_path
    ? supabase.storage.from("branding").getPublicUrl(psychologist.logo_path).data.publicUrl
    : null;

  return (
    <AppShell
      variant="paciente"
      theme={psychologist?.theme_json}
      logoUrl={logoUrl}
      workspaceName={psychologist?.professional_name}
    >
      {children}
    </AppShell>
  );
}
