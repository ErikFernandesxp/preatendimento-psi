import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Exclui a conta de um paciente por completo:
 *  1. Confirma que quem chama é o psicólogo dono desse paciente.
 *  2. Apaga o usuário no Supabase Auth via Admin API — isso cascateia
 *     (via ON DELETE CASCADE nas foreign keys) por profiles, patients,
 *     patient_activities, responses, response_files, psychologist_notes,
 *     consultation_points e notifications automaticamente.
 *  3. Os arquivos no Storage (bucket patient-files) não são apagados
 *     pelo cascade do Postgres — removidos aqui explicitamente.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: patientId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // RLS garante que só retorna se o paciente pertence a esse psicólogo.
  const { data: patient } = await supabase
    .from("patients")
    .select("id, profiles ( user_id )")
    .eq("id", patientId)
    .single();

  if (!patient) {
    return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });
  }

  const patientUserId = (patient.profiles as any)?.user_id;
  const admin = createServiceRoleClient();

  // Remove os arquivos do paciente no Storage antes de apagar o usuário
  // (o cascade do banco não alcança o Storage).
  const { data: files } = await admin.storage
    .from("patient-files")
    .list(`patient/${patientId}`, { limit: 1000 });
  if (files && files.length > 0) {
    // list() só retorna o primeiro nível; os arquivos reais ficam em
    // subpastas por atividade, então listamos recursivamente.
    const allPaths: string[] = [];
    for (const entry of files) {
      if (!entry.id) {
        // é uma "pasta" (atividade) — lista os arquivos dentro dela
        const { data: inner } = await admin.storage
          .from("patient-files")
          .list(`patient/${patientId}/${entry.name}`, { limit: 1000 });
        inner?.forEach((f) =>
          allPaths.push(`patient/${patientId}/${entry.name}/${f.name}`)
        );
      } else {
        allPaths.push(`patient/${patientId}/${entry.name}`);
      }
    }
    if (allPaths.length > 0) {
      await admin.storage.from("patient-files").remove(allPaths);
    }
  }

  if (patientUserId) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(patientUserId);
    if (deleteError) {
      return NextResponse.json({ error: "Erro ao excluir a conta do paciente." }, { status: 500 });
    }
  }

  await admin.from("audit_log").insert({
    user_id: user.id,
    action: "patient_deleted",
    entity_type: "patient",
    entity_id: patientId,
  });

  return NextResponse.json({ success: true });
}
