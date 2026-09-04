-- =====================================================================
-- 0006_activity_toggles_and_password_accounts.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Liga/desliga por atividade: mensagem e anexo na resposta do
--    paciente. allow_attachments já existia (seção 0001); adicionamos
--    o equivalente para mensagem.
-- ---------------------------------------------------------------------
alter table activities
  add column if not exists allow_message boolean not null default true;

-- ---------------------------------------------------------------------
-- 2) Contas de paciente criadas com senha temporária (sem depender de
--    e-mail/confirmação). must_change_password força a troca de senha
--    no primeiro login.
-- ---------------------------------------------------------------------
alter table profiles
  add column if not exists must_change_password boolean not null default false;

-- Atualiza o trigger de criação de profile para também gravar esse
-- campo, lendo de raw_user_meta_data (setado pela Admin API ao criar
-- o usuário com senha temporária).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_name text;
  v_phone text;
  v_must_change boolean;
  v_profile_id uuid;
begin
  v_role := coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'patient');
  v_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  v_phone := new.raw_user_meta_data->>'phone';
  v_must_change := coalesce((new.raw_user_meta_data->>'must_change_password')::boolean, false);

  insert into public.profiles (user_id, name, email, phone, role, must_change_password)
  values (new.id, v_name, new.email, v_phone, v_role, v_must_change)
  returning id into v_profile_id;

  if v_role = 'psychologist' then
    insert into public.psychologists (profile_id, professional_name)
    values (v_profile_id, v_name);
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3) Buckets de storage — limites e tipos de arquivo permitidos
--    ampliados. O bucket "patient-files" só aceitava PNG/JPEG/WEBP/PDF/
--    texto e 10MB, o que rejeitava fotos de iPhone (HEIC/HEIC), vídeos,
--    áudios e arquivos Word — causando erro no upload do paciente.
-- ---------------------------------------------------------------------
update storage.buckets
set
  file_size_limit = 52428800, -- 50 MB
  allowed_mime_types = array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
    'application/pdf',
    'text/plain',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/mp4', 'audio/aac',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
where id = 'patient-files';

update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
    'application/pdf',
    'text/plain',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/mp4', 'audio/aac',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
where id = 'activity-materials';
