begin;

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  whatsapp text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_full_name_not_blank check (char_length(btrim(full_name)) > 0),
  constraint users_whatsapp_not_blank check (char_length(btrim(whatsapp)) > 0),
  constraint users_whatsapp_unique unique (whatsapp)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan text not null,
  status text not null,
  start_date date not null,
  next_billing_date date null,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_user_id_unique unique (user_id),
  constraint subscriptions_plan_not_blank check (char_length(btrim(plan)) > 0),
  constraint subscriptions_source_not_blank check (char_length(btrim(source)) > 0),
  constraint subscriptions_status_check check (status in ('activa','gracia','suspendida','terminada')),
  constraint subscriptions_billing_date_check check (
    next_billing_date is null or next_billing_date >= start_date
  )
);

create table if not exists public.audit_logs (
  id bigserial primary key,
  occurred_at timestamptz not null default now(),
  actor_user_id uuid null references public.users(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  result text not null,
  constraint audit_logs_entity_type_not_blank check (char_length(btrim(entity_type)) > 0),
  constraint audit_logs_entity_id_not_blank check (char_length(btrim(entity_id)) > 0),
  constraint audit_logs_action_not_blank check (char_length(btrim(action)) > 0),
  constraint audit_logs_result_check check (result in ('ok','error'))
);

create table if not exists public.app_settings (
  id integer primary key default 1,
  grace_days integer not null,
  payment_reminder_template text not null,
  suspension_notice_template text not null,
  currency text not null,
  timezone text not null,
  date_format text not null,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton_check check (id = 1),
  constraint app_settings_grace_days_check check (grace_days >= 0 and grace_days <= 30),
  constraint app_settings_currency_check check (char_length(currency) = 3),
  constraint app_settings_timezone_not_blank check (char_length(btrim(timezone)) > 0),
  constraint app_settings_date_format_not_blank check (char_length(btrim(date_format)) > 0),
  constraint app_settings_payment_template_not_blank check (
    char_length(btrim(payment_reminder_template)) > 0
  ),
  constraint app_settings_suspension_template_not_blank check (
    char_length(btrim(suspension_notice_template)) > 0
  )
);

create index if not exists users_full_name_trgm_idx
  on public.users using gin (full_name gin_trgm_ops);

create index if not exists users_whatsapp_trgm_idx
  on public.users using gin (whatsapp gin_trgm_ops);

create index if not exists users_created_at_desc_idx
  on public.users (created_at desc);

create index if not exists subscriptions_status_next_billing_idx
  on public.subscriptions (status, next_billing_date);

create index if not exists subscriptions_next_billing_date_not_null_idx
  on public.subscriptions (next_billing_date)
  where next_billing_date is not null;

create index if not exists subscriptions_created_at_desc_idx
  on public.subscriptions (created_at desc);

create index if not exists audit_logs_occurred_at_desc_idx
  on public.audit_logs (occurred_at desc);

create index if not exists audit_logs_entity_lookup_idx
  on public.audit_logs (entity_type, entity_id, occurred_at desc);

create index if not exists audit_logs_actor_lookup_idx
  on public.audit_logs (actor_user_id, occurred_at desc)
  where actor_user_id is not null;

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

drop trigger if exists set_app_settings_updated_at on public.app_settings;
create trigger set_app_settings_updated_at
before update on public.app_settings
for each row
execute function public.set_updated_at();

commit;