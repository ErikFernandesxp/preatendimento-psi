-- =====================================================================
-- 0003_storage.sql
-- Bucket privado e políticas de acesso para arquivos de pacientes
--
-- Convenção de caminho dentro do bucket:
--   patient/{patient_id}/activities/{activity_id}/{filename}
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient-files',
  'patient-files',
  false,
  10485760,
  array[
    'image/png', 'image/jpeg', 'image/webp',
    'application/pdf',
    'text/plain'
  ]
)
on conflict (id) do nothing;

create or replace function storage_path_patient_id(object_name text)
returns uuid
language sql
immutable
as $$
  select (regexp_match(object_name, '^patient/([0-9a-fA-F-]{36})/'))[1]::uuid;
$$;

create policy "patient_files_patient_all"
  on storage.objects for all
  using (
    bucket_id = 'patient-files'
    and storage_path_patient_id(name) = auth_patient_id()
  )
  with check (
    bucket_id = 'patient-files'
    and storage_path_patient_id(name) = auth_patient_id()
  );

create policy "patient_files_psychologist_select"
  on storage.objects for select
  using (
    bucket_id = 'patient-files'
    and is_own_patient(storage_path_patient_id(name))
  );
