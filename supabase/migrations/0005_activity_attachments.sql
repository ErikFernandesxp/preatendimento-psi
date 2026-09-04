-- =====================================================================
-- 0005_activity_attachments.sql
-- Anexos que o PSICÓLOGO adiciona a uma atividade (material de apoio:
-- PDF, foto, vídeo, áudio, Word) — diferente de response_files, que
-- são os arquivos que o PACIENTE envia como resposta.
-- =====================================================================

create table activity_attachments (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_type text not null,
  file_size bigint,
  created_at timestamptz not null default now()
);

create index idx_activity_attachments_activity_id on activity_attachments(activity_id);

alter table activity_attachments enable row level security;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

create or replace function is_own_activity(p_activity_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from activities
    where id = p_activity_id
      and psychologist_id = auth_psychologist_id()
  );
$$;

create or replace function patient_has_activity(p_activity_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from patient_activities
    where activity_id = p_activity_id
      and patient_id = auth_patient_id()
  );
$$;

-- ---------------------------------------------------------------------
-- RLS: activity_attachments
-- ---------------------------------------------------------------------

create policy "activity_attachments_all_owner"
  on activity_attachments for all
  using (is_own_activity(activity_id))
  with check (is_own_activity(activity_id));

create policy "activity_attachments_select_patient"
  on activity_attachments for select
  using (patient_has_activity(activity_id));

-- ---------------------------------------------------------------------
-- Storage: bucket privado para os anexos de atividade
-- Convenção de caminho: activity/{activity_id}/{timestamp}-{filename}
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'activity-materials',
  'activity-materials',
  false,
  52428800, -- 50 MB
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'application/pdf',
    'text/plain',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/mp4',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

create or replace function storage_path_activity_id(object_name text)
returns uuid
language sql
immutable
as $$
  select (regexp_match(object_name, '^activity/([0-9a-fA-F-]{36})/'))[1]::uuid;
$$;

create policy "activity_materials_owner"
  on storage.objects for all
  using (
    bucket_id = 'activity-materials'
    and is_own_activity(storage_path_activity_id(name))
  )
  with check (
    bucket_id = 'activity-materials'
    and is_own_activity(storage_path_activity_id(name))
  );

create policy "activity_materials_patient_select"
  on storage.objects for select
  using (
    bucket_id = 'activity-materials'
    and patient_has_activity(storage_path_activity_id(name))
  );
