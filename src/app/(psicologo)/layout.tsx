import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";

export default async function PsicologoLayout({
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
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  // Segunda camada de proteção (a primeira é o middleware); o RLS no
  // banco é a camada que realmente impede acesso indevido a dados.
  if (profile?.role !== "psychologist") redirect("/paciente/inicio");

  const { data: psychologist } = await supabase
    .from("psychologists")
    .select("professional_name, theme_json, logo_path")
    .eq("profile_id", profile.id)
    .single();

  const logoUrl = psychologist?.logo_path
    ? supabase.storage.from("branding").getPublicUrl(psychologist.logo_path).data.publicUrl
    : null;

  return (
    <AppShell
      variant="psicologo"
      theme={psychologist?.theme_json as any}
      logoUrl={logoUrl}
      workspaceName={psychologist?.professional_name}
    >
      {children}
    </AppShell>
  );
}
