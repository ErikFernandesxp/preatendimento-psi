-- =====================================================================
-- 0001_schema.sql
-- Estrutura relacional principal do sistema de pré-atendimento
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type user_role as enum ('psychologist', 'patient');

create type patient_status as enum ('active', 'inactive');

create type activity_response_type as enum (
  'free_text',
  'objective_yes_no',
  'objective_scale',
  'objective_multiple_choice',
  'objective_single_choice',
  'diary',
  'image_upload',
  'file_upload'
);

create type activity_status as enum ('draft', 'sent', 'archived');

create type patient_activity_status as enum (
  'pending',
  'in_progress',
  'submitted',
  'viewed',
  'closed',
  'overdue'
);

create type response_status as enum (
  'pending',
  'in_progress',
  'submitted',
  'viewed',
  'closed'
);

create type note_flag as enum ('important', 'review_in_session', 'needs_attention');

-- ---------------------------------------------------------------------
-- profiles: 1 linha por usuário autenticado (psicólogo ou paciente)
-- ---------------------------------------------------------------------
create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  avatar_url text,
  role user_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_user_id on profiles(user_id);
create index idx_profiles_role on profiles(role);

-- ---------------------------------------------------------------------
-- psychologists
-- ---------------------------------------------------------------------
create table psychologists (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  professional_name text,
  registration_number text, -- ex: CRP
  bio text,
  created_at timestamptz not null default now()
);

create index idx_psychologists_profile_id on psychologists(profile_id);

-- ---------------------------------------------------------------------
-- patients
-- ---------------------------------------------------------------------
create table patients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  psychologist_id uuid not null references psychologists(id) on delete cascade,
  birth_date date,
  status patient_status not null default 'active',
  admin_notes text, -- observações administrativas (não clínicas)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_patients_profile_id on patients(profile_id);
create index idx_patients_psychologist_id on patients(psychologist_id);
create index idx_patients_status on patients(status);

-- ---------------------------------------------------------------------
-- activities: modelos de atividade criados pelo psicólogo
-- ---------------------------------------------------------------------
create table activities (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references psychologists(id) on delete cascade,
  title text not null,
  description text,
  instructions text,
  response_type activity_response_type not null,
  response_options jsonb, -- opções para escala / múltipla escolha / seleção única
  allow_attachments boolean not null default false,
  allowed_file_types text[], -- ex: {'image/png','image/jpeg','application/pdf'}
  max_file_size_mb int default 10,
  is_required boolean not null default true,
  due_date_offset_days int, -- prazo padrão em dias a partir do envio
  status activity_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_activities_psychologist_id on activities(psychologist_id);
create index idx_activities_status on activities(status);

-- ---------------------------------------------------------------------
-- patient_activities: vínculo entre uma atividade e um paciente
-- ---------------------------------------------------------------------
create table patient_activities (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  sent_at timestamptz not null default now(),
  due_date timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  status patient_activity_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index idx_patient_activities_activity_id on patient_activities(activity_id);
create index idx_patient_activities_patient_id on patient_activities(patient_id);
create index idx_patient_activities_status on patient_activities(status);
create index idx_patient_activities_due_date on patient_activities(due_date);

-- ---------------------------------------------------------------------
-- responses: resposta do paciente a uma patient_activity
-- ---------------------------------------------------------------------
create table responses (
  id uuid primary key default gen_random_uuid(),
  patient_activity_id uuid not null unique references patient_activities(id) on delete cascade,
  text_response text,
  structured_response jsonb, -- respostas objetivas (escala, múltipla escolha etc.)
  is_draft boolean not null default true,
  submitted_at timestamptz,
  status response_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_responses_patient_activity_id on responses(patient_activity_id);
create index idx_responses_status on responses(status);

-- ---------------------------------------------------------------------
-- response_files: arquivos/imagens anexados a uma resposta
-- ---------------------------------------------------------------------
create table response_files (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references responses(id) on delete cascade,
  file_path text not null, -- caminho dentro do bucket patient-files
  file_name text not null,
  file_type text not null,
  file_size bigint,
  created_at timestamptz not null default now()
);

create index idx_response_files_response_id on response_files(response_id);

-- ---------------------------------------------------------------------
-- psychologist_notes: anotações clínicas privadas (nunca vão ao paciente)
-- ---------------------------------------------------------------------
create table psychologist_notes (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references psychologists(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_psychologist_notes_psychologist_id on psychologist_notes(psychologist_id);
create index idx_psychologist_notes_patient_id on psychologist_notes(patient_id);

-- ---------------------------------------------------------------------
-- consultation_points: pontos para abordar na próxima consulta (privados)
-- ---------------------------------------------------------------------
create table consultation_points (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references psychologists(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  content text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_consultation_points_patient_id on consultation_points(patient_id);

-- ---------------------------------------------------------------------
-- response_flags: marcação de respostas como importante / revisar / atenção
-- (apoia a seção "Pré-atendimento" sem misturar com a tabela responses)
-- ---------------------------------------------------------------------
create table response_flags (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references responses(id) on delete cascade,
  psychologist_id uuid not null references psychologists(id) on delete cascade,
  flag note_flag not null,
  created_at timestamptz not null default now(),
  unique (response_id, flag)
);

create index idx_response_flags_response_id on response_flags(response_id);

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text, -- ex: 'new_activity', 'response_submitted', 'due_soon'
  metadata jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_id on notifications(user_id);
create index idx_notifications_read on notifications(read);

-- ---------------------------------------------------------------------
-- audit_log: auditoria de ações importantes (seção 20 do prompt)
-- ---------------------------------------------------------------------
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null, -- ex: 'login', 'activity_created', 'response_submitted'
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_log_user_id on audit_log(user_id);
create index idx_audit_log_action on audit_log(action);
create index idx_audit_log_created_at on audit_log(created_at);

-- ---------------------------------------------------------------------
-- updated_at trigger genérico
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger trg_patients_updated_at before update on patients
  for each row execute function set_updated_at();
create trigger trg_activities_updated_at before update on activities
  for each row execute function set_updated_at();
create trigger trg_responses_updated_at before update on responses
  for each row execute function set_updated_at();
create trigger trg_psychologist_notes_updated_at before update on psychologist_notes
  for each row execute function set_updated_at();
