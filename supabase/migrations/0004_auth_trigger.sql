-- =====================================================================
-- 0004_auth_trigger.sql
-- Cria profiles (e psychologists, quando aplicável) automaticamente
-- toda vez que um usuário é criado em auth.users.
-- =====================================================================

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
  v_profile_id uuid;
begin
  v_role := coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'patient');
  v_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  v_phone := new.raw_user_meta_data->>'phone';

  insert into public.profiles (user_id, name, email, phone, role)
  values (new.id, v_name, new.email, v_phone, v_role)
  returning id into v_profile_id;

  if v_role = 'psychologist' then
    insert into public.psychologists (profile_id, professional_name)
    values (v_profile_id, v_name);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
