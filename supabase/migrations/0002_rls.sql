-- =====================================================================
-- 0002_rls.sql
-- Row Level Security — nunca confiar apenas no frontend
-- =====================================================================

alter table profiles enable row level security;
alter table psychologists enable row level security;
alter table patients enable row level security;
alter table activities enable row level security;
alter table patient_activities enable row level security;
alter table responses enable row level security;
alter table response_files enable row level security;
alter table psychologist_notes enable row level security;
alter table consultation_points enable row level security;
alter table response_flags enable row level security;
alter table notifications enable row level security;
alter table audit_log enable row level security;

-- ---------------------------------------------------------------------
-- Funções auxiliares (security definer para evitar recursão de RLS)
-- ---------------------------------------------------------------------

create or replace function auth_profile_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from profiles where user_id = auth.uid();
$$;

create or replace function auth_psychologist_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select ps.id
  from psychologists ps
  join profiles pr on pr.id = ps.profile_id
  where pr.user_id = auth.uid();
$$;

create or replace function auth_patient_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select pa.id
  from patients pa
  join profiles pr on pr.id = pa.profile_id
  where pr.user_id = auth.uid();
$$;

create or replace function is_own_patient(p_patient_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from patients
    where id = p_patient_id
      and psychologist_id = auth_psychologist_id()
  );
$$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create policy "profiles_select_own"
  on profiles for select
  using (user_id = auth.uid());

create policy "profiles_select_linked_patient"
  on profiles for select
  using (
    exists (
      select 1 from patients pa
      where pa.profile_id = profiles.id
        and pa.psychologist_id = auth_psychologist_id()
    )
  );

create policy "profiles_select_own_psychologist"
  on profiles for select
  using (
    exists (
      select 1 from patients pt
      join psychologists ps on ps.id = pt.psychologist_id
      where pt.id = auth_patient_id()
        and ps.profile_id = profiles.id
    )
  );

create policy "profiles_update_own"
  on profiles for update
  using (user_id = auth.uid());

create policy "profiles_insert_own"
  on profiles for insert
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- psychologists
-- ---------------------------------------------------------------------
create policy "psychologists_select_own"
  on psychologists for select
  using (profile_id = auth_profile_id());

create policy "psychologists_select_by_own_patient"
  on psychologists for select
  using (
    exists (
      select 1 from patients pt
      where pt.psychologist_id = psychologists.id
        and pt.id = auth_patient_id()
    )
  );

create policy "psychologists_insert_own"
  on psychologists for insert
  with check (profile_id = auth_profile_id());

create policy "psychologists_update_own"
  on psychologists for update
  using (profile_id = auth_profile_id());

-- ---------------------------------------------------------------------
-- patients
-- ---------------------------------------------------------------------
create policy "patients_select_own_psychologist"
  on patients for select
  using (psychologist_id = auth_psychologist_id());

create policy "patients_select_self"
  on patients for select
  using (profile_id = auth_profile_id());

create policy "patients_insert_by_psychologist"
  on patients for insert
  with check (psychologist_id = auth_psychologist_id());

create policy "patients_update_by_psychologist"
  on patients for update
  using (psychologist_id = auth_psychologist_id());

-- ---------------------------------------------------------------------
-- activities (modelos criados pelo psicólogo)
-- ---------------------------------------------------------------------
create policy "activities_all_by_owner"
  on activities for all
  using (psychologist_id = auth_psychologist_id())
  with check (psychologist_id = auth_psychologist_id());

-- ---------------------------------------------------------------------
-- patient_activities
-- ---------------------------------------------------------------------
create policy "patient_activities_select_psychologist"
  on patient_activities for select
  using (is_own_patient(patient_id));

create policy "patient_activities_select_patient"
  on patient_activities for select
  using (patient_id = auth_patient_id());

create policy "patient_activities_insert_psychologist"
  on patient_activities for insert
  with check (is_own_patient(patient_id));

create policy "patient_activities_update_psychologist"
  on patient_activities for update
  using (is_own_patient(patient_id));

create policy "patient_activities_update_patient"
  on patient_activities for update
  using (patient_id = auth_patient_id());

-- ---------------------------------------------------------------------
-- responses
-- ---------------------------------------------------------------------
create policy "responses_select_psychologist"
  on responses for select
  using (
    exists (
      select 1 from patient_activities pa
      where pa.id = responses.patient_activity_id
        and is_own_patient(pa.patient_id)
    )
  );

create policy "responses_select_patient"
  on responses for select
  using (
    exists (
      select 1 from patient_activities pa
      where pa.id = responses.patient_activity_id
        and pa.patient_id = auth_patient_id()
    )
  );

create policy "responses_insert_patient"
  on responses for insert
  with check (
    exists (
      select 1 from patient_activities pa
      where pa.id = responses.patient_activity_id
        and pa.patient_id = auth_patient_id()
    )
  );

create policy "responses_update_patient"
  on responses for update
  using (
    exists (
      select 1 from patient_activities pa
      where pa.id = responses.patient_activity_id
        and pa.patient_id = auth_patient_id()
    )
  );

create policy "responses_update_psychologist"
  on responses for update
  using (
    exists (
      select 1 from patient_activities pa
      where pa.id = responses.patient_activity_id
        and is_own_patient(pa.patient_id)
    )
  );

-- ---------------------------------------------------------------------
-- response_files
-- ---------------------------------------------------------------------
create policy "response_files_select_psychologist"
  on response_files for select
  using (
    exists (
      select 1 from responses r
      join patient_activities pa on pa.id = r.patient_activity_id
      where r.id = response_files.response_id
        and is_own_patient(pa.patient_id)
    )
  );

create policy "response_files_select_patient"
  on response_files for select
  using (
    exists (
      select 1 from responses r
      join patient_activities pa on pa.id = r.patient_activity_id
      where r.id = response_files.response_id
        and pa.patient_id = auth_patient_id()
    )
  );

create policy "response_files_insert_patient"
  on response_files for insert
  with check (
    exists (
      select 1 from responses r
      join patient_activities pa on pa.id = r.patient_activity_id
      where r.id = response_files.response_id
        and pa.patient_id = auth_patient_id()
    )
  );

create policy "response_files_delete_patient"
  on response_files for delete
  using (
    exists (
      select 1 from responses r
      join patient_activities pa on pa.id = r.patient_activity_id
      where r.id = response_files.response_id
        and pa.patient_id = auth_patient_id()
        and r.is_draft = true
    )
  );

-- ---------------------------------------------------------------------
-- psychologist_notes — EXCLUSIVAMENTE do psicólogo, nunca do paciente
-- ---------------------------------------------------------------------
create policy "psychologist_notes_all_owner"
  on psychologist_notes for all
  using (psychologist_id = auth_psychologist_id())
  with check (psychologist_id = auth_psychologist_id());

-- ---------------------------------------------------------------------
-- consultation_points — privados do psicólogo
-- ---------------------------------------------------------------------
create policy "consultation_points_all_owner"
  on consultation_points for all
  using (psychologist_id = auth_psychologist_id())
  with check (psychologist_id = auth_psychologist_id());

-- ---------------------------------------------------------------------
-- response_flags — privados do psicólogo
-- ---------------------------------------------------------------------
create policy "response_flags_all_owner"
  on response_flags for all
  using (psychologist_id = auth_psychologist_id())
  with check (psychologist_id = auth_psychologist_id());

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
create policy "notifications_select_own"
  on notifications for select
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on notifications for update
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------
create policy "audit_log_select_own"
  on audit_log for select
  using (user_id = auth.uid());
