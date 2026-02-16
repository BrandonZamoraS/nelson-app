begin;

create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text null,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_profiles_role_check check (role in ('owner', 'admin')),
  constraint admin_profiles_email_not_blank check (char_length(btrim(email)) > 0)
);

create index if not exists admin_profiles_active_role_idx
  on public.admin_profiles (is_active, role);

drop trigger if exists set_admin_profiles_updated_at on public.admin_profiles;
create trigger set_admin_profiles_updated_at
before update on public.admin_profiles
for each row
execute function public.set_updated_at();

alter table public.audit_logs
  add column if not exists actor_admin_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'audit_logs_actor_admin_id_fkey'
  ) then
    alter table public.audit_logs
      add constraint audit_logs_actor_admin_id_fkey
      foreign key (actor_admin_id)
      references public.admin_profiles(id)
      on delete set null;
  end if;
end
$$;

create index if not exists audit_logs_actor_admin_lookup_idx
  on public.audit_logs (actor_admin_id, occurred_at desc)
  where actor_admin_id is not null;

drop index if exists audit_logs_actor_lookup_idx;
alter table public.audit_logs drop column if exists actor_user_id;

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles ap
    where ap.id = auth.uid()
      and ap.is_active = true
  );
$$;

revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to authenticated;

alter table public.admin_profiles enable row level security;
alter table public.users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_settings enable row level security;

grant select on table public.admin_profiles to authenticated;

grant select, insert, update, delete on table public.users to authenticated;
grant select, insert, update, delete on table public.subscriptions to authenticated;
grant select, insert on table public.audit_logs to authenticated;
grant usage, select on sequence public.audit_logs_id_seq to authenticated;
grant select, update on table public.app_settings to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_profiles'
      and policyname = 'admin_profiles_select_own'
  ) then
    create policy admin_profiles_select_own
      on public.admin_profiles
      for select
      to authenticated
      using (id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_profiles'
      and policyname = 'admin_profiles_select_active_admin'
  ) then
    create policy admin_profiles_select_active_admin
      on public.admin_profiles
      for select
      to authenticated
      using (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'users_select_active_admin'
  ) then
    create policy users_select_active_admin
      on public.users
      for select
      to authenticated
      using (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'users_insert_active_admin'
  ) then
    create policy users_insert_active_admin
      on public.users
      for insert
      to authenticated
      with check (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'users_update_active_admin'
  ) then
    create policy users_update_active_admin
      on public.users
      for update
      to authenticated
      using (public.is_active_admin())
      with check (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'users_delete_active_admin'
  ) then
    create policy users_delete_active_admin
      on public.users
      for delete
      to authenticated
      using (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subscriptions'
      and policyname = 'subscriptions_select_active_admin'
  ) then
    create policy subscriptions_select_active_admin
      on public.subscriptions
      for select
      to authenticated
      using (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subscriptions'
      and policyname = 'subscriptions_insert_active_admin'
  ) then
    create policy subscriptions_insert_active_admin
      on public.subscriptions
      for insert
      to authenticated
      with check (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subscriptions'
      and policyname = 'subscriptions_update_active_admin'
  ) then
    create policy subscriptions_update_active_admin
      on public.subscriptions
      for update
      to authenticated
      using (public.is_active_admin())
      with check (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subscriptions'
      and policyname = 'subscriptions_delete_active_admin'
  ) then
    create policy subscriptions_delete_active_admin
      on public.subscriptions
      for delete
      to authenticated
      using (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_logs'
      and policyname = 'audit_logs_select_active_admin'
  ) then
    create policy audit_logs_select_active_admin
      on public.audit_logs
      for select
      to authenticated
      using (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_logs'
      and policyname = 'audit_logs_insert_active_admin'
  ) then
    create policy audit_logs_insert_active_admin
      on public.audit_logs
      for insert
      to authenticated
      with check (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'app_settings'
      and policyname = 'app_settings_select_active_admin'
  ) then
    create policy app_settings_select_active_admin
      on public.app_settings
      for select
      to authenticated
      using (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'app_settings'
      and policyname = 'app_settings_update_active_admin'
  ) then
    create policy app_settings_update_active_admin
      on public.app_settings
      for update
      to authenticated
      using (public.is_active_admin())
      with check (public.is_active_admin());
  end if;
end
$$;

commit;
