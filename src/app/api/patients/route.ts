import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { generateTempPassword } from "@/lib/utils/password";

/**
 * Cria um novo paciente:
 *  1. Confirma que quem chama é um psicólogo autenticado.
 *  2. Usa a service role (backend, nunca exposta ao browser) para criar
 *     o usuário no Supabase Auth já com uma senha temporária aleatória
 *     e e-mail confirmado — sem depender do envio de e-mail (evita o
 *     limite de envio do Supabase). O paciente troca essa senha por
 *     uma própria no primeiro login (must_change_password).
 *  3. O profile é criado automaticamente por um trigger no banco (ver
 *     supabase/migrations/0004_auth_trigger.sql e 0006_...sql), que
 *     roda de forma síncrona dentro da mesma transação da criação do
 *     usuário — por isso já podemos buscá-lo logo em seguida.
 *  4. Cria a linha em "patients" vinculando esse profile ao psicólogo.
 *
 * A criação do usuário via Admin API precisa acontecer no servidor:
 * a service role key nunca deve chegar ao cliente. A senha temporária
 * só é retornada UMA VEZ, nesta resposta — não fica salva em lugar
 * nenhum do banco.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const { data: psychologist } = await supabase
    .from("psychologists")
    .select("id")
    .eq("profile_id", callerProfile?.id ?? "")
    .single();

  if (!psychologist) {
    return NextResponse.json({ error: "Apenas psicólogos podem cadastrar pacientes." }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, phone, birth_date } = body as {
    name: string;
    email: string;
    phone?: string;
    birth_date?: string;
  };

  if (!name || !email) {
    return NextResponse.json({ error: "Nome e e-mail são obrigatórios." }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const tempPassword = generateTempPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true, // já entra confirmado, sem depender de e-mail
    user_metadata: {
      name,
      phone: phone ?? null,
      role: "patient",
      must_change_password: true,
    },
  });

  if (createError || !created.user) {
    const message =
      createError?.message?.includes("already been registered") ||
      createError?.code === "email_exists"
        ? "Já existe uma conta com esse e-mail."
        : createError?.message ?? "Não foi possível criar o paciente.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // O trigger on_auth_user_created já criou a linha em "profiles" neste
  // ponto (roda na mesma transação do insert em auth.users).
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("user_id", created.user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Usuário criado, mas o perfil não foi encontrado. Tente novamente." },
      { status: 500 }
    );
  }

  const { data: patient, error: patientError } = await admin
    .from("patients")
    .insert({
      profile_id: profile.id,
      psychologist_id: psychologist.id,
      birth_date: birth_date || null,
    })
    .select()
    .single();

  if (patientError || !patient) {
    return NextResponse.json({ error: "Erro ao vincular o paciente." }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    user_id: user.id,
    action: "patient_created",
    entity_type: "patient",
    entity_id: patient.id,
  });

  return NextResponse.json({ patient, tempPassword });
}
