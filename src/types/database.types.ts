// Tipos do banco de dados.
// Em produção, prefira gerar este arquivo automaticamente com:
//   npx supabase gen types typescript --project-id <id> > src/types/database.types.ts
// Este arquivo cobre o schema definido em supabase/migrations/0001_schema.sql
// + supabase/migrations/0005_anexos_e_tema.sql.

export type UserRole = "psychologist" | "patient";
export type PatientStatus = "active" | "inactive";
export type ActivityResponseType =
  | "free_text"
  | "objective_yes_no"
  | "objective_scale"
  | "objective_multiple_choice"
  | "objective_single_choice"
  | "diary"
  | "image_upload"
  | "file_upload";
export type ActivityStatus = "draft" | "sent" | "archived";
export type PatientActivityStatus =
  | "pending"
  | "in_progress"
  | "submitted"
  | "viewed"
  | "closed"
  | "overdue";
export type ResponseStatus = "pending" | "in_progress" | "submitted" | "viewed" | "closed";
export type NoteFlag = "important" | "review_in_session" | "needs_attention";

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Psychologist {
  id: string;
  profile_id: string;
  professional_name: string | null;
  registration_number: string | null;
  bio: string | null;
  // Cores personalizadas do workspace: { page_bg, section_bg, button_bg }
  // (ver src/lib/utils/theme.ts). Sempre um objeto, nunca null (default '{}').
  theme_json: Record<string, string>;
  // Caminho dentro do bucket público "branding", ex: psychologist/{id}/logo.png
  logo_path: string | null;
  created_at: string;
}

export interface Patient {
  id: string;
  profile_id: string;
  psychologist_id: string;
  birth_date: string | null;
  status: PatientStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  psychologist_id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  response_type: ActivityResponseType;
  response_options: Record<string, unknown> | null;
  allow_attachments: boolean;
  allowed_file_types: string[] | null;
  max_file_size_mb: number | null;
  is_required: boolean;
  due_date_offset_days: number | null;
  status: ActivityStatus;
  created_at: string;
  updated_at: string;
}

// Material de apoio anexado pelo PSICÓLOGO na atividade (PDF, foto,
// vídeo etc.) - visível a todos os pacientes que recebem a atividade.
// Não confundir com ResponseFile, que é o arquivo que o PACIENTE anexa
// na resposta dele.
export interface ActivityAttachment {
  id: string;
  activity_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  created_at: string;
}

export interface PatientActivity {
  id: string;
  activity_id: string;
  patient_id: string;
  sent_at: string;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  status: PatientActivityStatus;
  created_at: string;
}

export interface Response {
  id: string;
  patient_activity_id: string;
  text_response: string | null;
  structured_response: Record<string, unknown> | null;
  is_draft: boolean;
  submitted_at: string | null;
  status: ResponseStatus;
  created_at: string;
  updated_at: string;
}

export interface ResponseFile {
  id: string;
  response_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  created_at: string;
}

export interface PsychologistNote {
  id: string;
  psychologist_id: string;
  patient_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ConsultationPoint {
  id: string;
  psychologist_id: string;
  patient_id: string;
  content: string;
  completed: boolean;
  created_at: string;
}

export interface ResponseFlag {
  id: string;
  response_id: string;
  psychologist_id: string;
  flag: NoteFlag;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string | null;
  metadata: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// Utilitário mínimo compatível com o formato esperado pelo
// @supabase/ssr / supabase-js para tipagem de tabelas.
type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile>;
      psychologists: Table<Psychologist>;
      patients: Table<Patient>;
      activities: Table<Activity>;
      activity_attachments: Table<ActivityAttachment>;
      patient_activities: Table<PatientActivity>;
      responses: Table<Response>;
      response_files: Table<ResponseFile>;
      psychologist_notes: Table<PsychologistNote>;
      consultation_points: Table<ConsultationPoint>;
      response_flags: Table<ResponseFlag>;
      notifications: Table<Notification>;
      audit_log: Table<AuditLog>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      patient_status: PatientStatus;
      activity_response_type: ActivityResponseType;
      activity_status: ActivityStatus;
      patient_activity_status: PatientActivityStatus;
      response_status: ResponseStatus;
      note_flag: NoteFlag;
    };
  };
}
