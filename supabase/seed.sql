begin;

insert into public.app_settings (
  id,
  grace_days,
  payment_reminder_template,
  suspension_notice_template
)
values (
  1,
  3,
  'Hola {{name}}, tu pago vence el {{next_billing_date}}. Evita suspension renovando hoy.',
  'Hola {{name}}, tu suscripcion fue suspendida. Escribenos para reactivarla.'
)
on conflict (id) do update
set grace_days = excluded.grace_days,
    payment_reminder_template = excluded.payment_reminder_template,
    suspension_notice_template = excluded.suspension_notice_template,
    updated_at = now();

with user_seed(full_name, whatsapp, plan, amount_cents, status, start_date, next_billing_date, source) as (
  values
    ('Maria Lopez', '+5493514558821', 'Mensual', 19800, 'activa', date '2025-12-05', date '2026-02-12', 'manual'),
    ('Jorge Benitez', '+5493511230002', 'Mensual', 19800, 'gracia', date '2026-01-12', date '2026-02-12', 'manual'),
    ('Ana Gomez', '+5493511230003', 'Anual', 182000, 'suspendida', date '2025-11-20', null, 'hotmart')
),
upsert_users as (
  insert into public.users (full_name, whatsapp)
  select full_name, whatsapp
  from user_seed
  on conflict (whatsapp) do update
  set full_name = excluded.full_name,
      updated_at = now()
  returning id, whatsapp
),
resolved_user_subscriptions as (
  select
    u.id as user_id,
    s.plan,
    s.amount_cents,
    s.status,
    s.start_date,
    s.next_billing_date,
    s.source
  from user_seed s
  join public.users u on u.whatsapp = s.whatsapp
)
insert into public.subscriptions (
  user_id,
  plan,
  amount_cents,
  status,
  start_date,
  next_billing_date,
  source
)
select
  user_id,
  plan,
  amount_cents,
  status,
  start_date,
  next_billing_date,
  source
from resolved_user_subscriptions
on conflict (user_id) do update
set plan = excluded.plan,
    amount_cents = excluded.amount_cents,
    status = excluded.status,
    start_date = excluded.start_date,
    next_billing_date = excluded.next_billing_date,
    source = excluded.source,
    updated_at = now();

commit;
