begin;

alter table public.subscriptions
  add column if not exists amount_cents integer;

update public.subscriptions
set amount_cents = 1000
where amount_cents is null;

alter table public.subscriptions
  alter column amount_cents set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_amount_cents_positive_check'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_amount_cents_positive_check
      check (amount_cents > 0);
  end if;
end
$$;

alter table public.subscriptions
  add column if not exists currency text not null default 'USD';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_currency_usd_check'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_currency_usd_check
      check (currency = 'USD');
  end if;
end
$$;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  amount_cents integer not null,
  currency text not null default 'USD',
  status text not null,
  paid_at timestamptz null,
  due_at date not null,
  source text not null default 'manual',
  external_ref text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_amount_cents_positive_check check (amount_cents > 0),
  constraint payments_currency_usd_check check (currency = 'USD'),
  constraint payments_status_check check (status in ('pending','paid','failed','refunded'))
);

create index if not exists payments_status_paid_at_idx
  on public.payments (status, paid_at desc);

create index if not exists payments_user_paid_at_idx
  on public.payments (user_id, paid_at desc);

create index if not exists payments_subscription_paid_at_idx
  on public.payments (subscription_id, paid_at desc);

create index if not exists payments_paid_only_paid_at_idx
  on public.payments (paid_at desc)
  where status = 'paid';

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();

alter table public.app_settings
  drop column if exists currency;

alter table public.app_settings
  drop constraint if exists app_settings_currency_check;

alter table public.payments enable row level security;

grant select, insert, update, delete on table public.payments to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payments'
      and policyname = 'payments_select_active_admin'
  ) then
    create policy payments_select_active_admin
      on public.payments
      for select
      to authenticated
      using (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payments'
      and policyname = 'payments_insert_active_admin'
  ) then
    create policy payments_insert_active_admin
      on public.payments
      for insert
      to authenticated
      with check (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payments'
      and policyname = 'payments_update_active_admin'
  ) then
    create policy payments_update_active_admin
      on public.payments
      for update
      to authenticated
      using (public.is_active_admin())
      with check (public.is_active_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payments'
      and policyname = 'payments_delete_active_admin'
  ) then
    create policy payments_delete_active_admin
      on public.payments
      for delete
      to authenticated
      using (public.is_active_admin());
  end if;
end
$$;

commit;
