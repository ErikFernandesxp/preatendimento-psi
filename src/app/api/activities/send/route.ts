import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { addDays } from "date-fns";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { activity_id, patient_id, due_date } = await req.json();

  if (!activity_id || !patient_id) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  const { data: activity } = await supabase
    .from("activities")
    .select("id, title, due_date_offset_days")
    .eq("id", activity_id)
    .single();

  if (!activity) {
    return NextResponse.json({ error: "Atividade não encontrada." }, { status: 404 });
  }

  const resolvedDueDate =
    due_date ??
    (activity.due_date_offset_days
      ? addDays(new Date(), activity.due_date_offset_days).toISOString()
      : null);

  const { data: patientActivity, error } = await supabase
    .from("patient_activities")
    .insert({
      activity_id,
      patient_id,
      due_date: resolvedDueDate,
      status: "pending",
    })
    .select()
    .single();

  if (error || !patientActivity) {
    return NextResponse.json({ error: "Erro ao enviar a atividade." }, { status: 500 });
  }

  // Marca o modelo de atividade como "enviado" (usado ao menos uma vez)
  await supabase.from("activities").update({ status: "sent" }).eq("id", activity_id);

  // Notificação e audit log usam service role (inserção não é permitida
  // diretamente pelo cliente autenticado — ver policies em 0002_rls.sql).
  const admin = createServiceRoleClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("profiles ( user_id )")
    .eq("id", patient_id)
    .single();

  const patientUserId = (patient?.profiles as any)?.user_id;

  if (patientUserId) {
    await admin.from("notifications").insert({
      user_id: patientUserId,
      title: "Nova atividade recebida",
      message: `Você recebeu uma nova atividade do seu psicólogo: ${activity.title}`,
      type: "new_activity",
      metadata: { patient_activity_id: patientActivity.id },
    });
  }

  await admin.from("audit_log").insert({
    user_id: user.id,
    action: "activity_sent",
    entity_type: "patient_activity",
    entity_id: patientActivity.id,
  });

  return NextResponse.json({ patientActivity });
}
