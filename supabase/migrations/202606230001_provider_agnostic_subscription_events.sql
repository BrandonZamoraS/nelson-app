begin;

alter table public.users
  add column if not exists is_active boolean not null default true;

alter table public.users
  add column if not exists deactivated_at timestamptz null;

alter table public.app_settings
  add column if not exists initial_subscription_amount_cents integer;

update public.app_settings
set initial_subscription_amount_cents = 2000
where initial_subscription_amount_cents is null;

alter table public.app_settings
  alter column initial_subscription_amount_cents set default 2000;

alter table public.app_settings
  alter column initial_subscription_amount_cents set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_settings_initial_subscription_amount_positive_check'
  ) then
    alter table public.app_settings
      add constraint app_settings_initial_subscription_amount_positive_check
      check (initial_subscription_amount_cents > 0);
  end if;
end
$$;

create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null,
  event_type text not null,
  source text not null,
  subscription_id uuid null references public.subscriptions(id) on delete set null,
  user_id uuid null references public.users(id) on delete set null,
  amount_cents integer null,
  currency text not null default 'USD',
  occurred_at timestamptz not null,
  paid_at timestamptz null,
  status text not null default 'pending_review',
  error_code text null,
  metadata jsonb not null default '{}'::jsonb,
  processed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_events_idempotency_key_unique unique (idempotency_key),
  constraint subscription_events_event_type_not_blank check (char_length(btrim(event_type)) > 0),
  constraint subscription_events_source_not_blank check (char_length(btrim(source)) > 0),
  constraint subscription_events_currency_usd_check check (currency = 'USD'),
  constraint subscription_events_amount_positive_check check (amount_cents is null or amount_cents > 0),
  constraint subscription_events_status_check check (status in ('processed','ignored','rejected','pending_review'))
);

create index if not exists subscription_events_subscription_id_idx
  on public.subscription_events (subscription_id);

create index if not exists subscription_events_user_id_idx
  on public.subscription_events (user_id);

create index if not exists subscription_events_occurred_at_idx
  on public.subscription_events (occurred_at desc);

create index if not exists subscription_events_pending_review_idx
  on public.subscription_events (status, occurred_at desc)
  where status = 'pending_review';

drop trigger if exists set_subscription_events_updated_at on public.subscription_events;
create trigger set_subscription_events_updated_at
before update on public.subscription_events
for each row
execute function public.set_updated_at();

alter table public.payments
  add column if not exists event_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payments_event_id_fkey'
  ) then
    alter table public.payments
      add constraint payments_event_id_fkey
      foreign key (event_id)
      references public.subscription_events(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'payments_event_id_unique'
  ) then
    alter table public.payments
      add constraint payments_event_id_unique unique (event_id);
  end if;
end
$$;

create or replace function public.apply_subscription_event(event_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_existing_event public.subscription_events%rowtype;
  v_event public.subscription_events%rowtype;
  v_subscription public.subscriptions%rowtype;
  v_user public.users%rowtype;
  v_payment public.payments%rowtype;
  v_settings public.app_settings%rowtype;
  v_event_type text := event_payload->>'event_type';
  v_source text := coalesce(event_payload->>'source', 'system');
  v_requested_subscription_id text := nullif(event_payload->>'subscription_id', '');
  v_requested_user_id text := nullif(event_payload->>'user_id', '');
  v_subscription_id uuid := nullif(event_payload->>'subscription_id', '')::uuid;
  v_user_id uuid := nullif(event_payload->>'user_id', '')::uuid;
  v_amount_cents integer := nullif(event_payload->>'amount_cents', '')::integer;
  v_currency text := coalesce(event_payload->>'currency', 'USD');
  v_occurred_at timestamptz := coalesce((event_payload->>'occurred_at')::timestamptz, now());
  v_paid_at timestamptz := nullif(event_payload->>'paid_at', '')::timestamptz;
  v_whatsapp text := nullif(event_payload->>'whatsapp', '');
  v_full_name text := nullif(event_payload->>'full_name', '');
  v_plan text := coalesce(nullif(event_payload->>'plan', ''), 'initial_month');
  v_target_status text := nullif(event_payload->>'target_status', '');
  v_metadata jsonb := jsonb_strip_nulls(
    coalesce(event_payload->'metadata', '{}'::jsonb) ||
    jsonb_build_object(
      'requested_subscription_id', event_payload->>'subscription_id',
      'requested_user_id', event_payload->>'user_id',
      'whatsapp', v_whatsapp,
      'full_name', v_full_name
    )
  );
  v_expected_amount integer;
  v_next_billing_date date;
  v_event_status text := 'processed';
  v_error_code text := null;
  v_duplicate boolean := false;
  v_reactivated_user boolean := false;
begin
  insert into public.subscription_events (
    idempotency_key,
    event_type,
    source,
    subscription_id,
    user_id,
    amount_cents,
    currency,
    occurred_at,
    paid_at,
    status,
    metadata
  )
  values (
    event_payload->>'idempotency_key',
    v_event_type,
    v_source,
    null,
    null,
    v_amount_cents,
    v_currency,
    v_occurred_at,
    v_paid_at,
    'pending_review',
    v_metadata
  )
  on conflict (idempotency_key) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select *
    into v_existing_event
    from public.subscription_events
    where idempotency_key = event_payload->>'idempotency_key';

    v_duplicate := true;

    return jsonb_build_object(
      'duplicate', true,
      'event', to_jsonb(v_existing_event),
      'subscription', null,
      'payment', null,
      'user', null
    );
  end if;

  select * into v_event from public.subscription_events where id = v_event_id;

  begin
    if v_subscription_id is not null then
      select s.*
      into v_subscription
      from public.subscriptions s
      where s.id = v_subscription_id
      for update;
    end if;

    if v_subscription.id is null and v_user_id is not null then
      select s.*
      into v_subscription
      from public.subscriptions s
      where s.user_id = v_user_id
      for update;
    end if;

    if v_whatsapp is not null then
      select *
      into v_user
      from public.users u
      where u.whatsapp = v_whatsapp
      limit 1;
    elsif v_user_id is not null then
      select *
      into v_user
      from public.users u
      where u.id = v_user_id
      limit 1;
    elsif v_subscription.user_id is not null then
      select *
      into v_user
      from public.users u
      where u.id = v_subscription.user_id
      limit 1;
    end if;

    if v_subscription.id is null and v_user_id is not null and v_user.id is not null and v_user_id <> v_user.id then
      v_event_status := 'rejected';
      v_error_code := 'subscription_whatsapp_conflict';
    end if;

    if v_subscription.id is null and v_user.id is not null then
      select s.*
      into v_subscription
      from public.subscriptions s
      where s.user_id = v_user.id
      for update;
    end if;

    if v_subscription.id is not null and v_subscription.user_id is not null then
      if v_user_id is not null and v_user_id <> v_subscription.user_id then
        v_event_status := 'rejected';
        v_error_code := 'subscription_user_conflict';
      elsif v_user.id is not null and v_user.id <> v_subscription.user_id then
        v_event_status := 'rejected';
        v_error_code := case
          when v_whatsapp is not null then 'subscription_whatsapp_conflict'
          else 'subscription_user_conflict'
        end;
      elsif v_user.id is null then
        select *
        into v_user
        from public.users u
        where u.id = v_subscription.user_id
        limit 1;
      end if;
    end if;

    select *
    into v_settings
    from public.app_settings
    where id = 1;

    if v_event_status <> 'processed' then
      null;
    elsif v_event_type = 'payment_succeeded' then
      v_expected_amount := coalesce(v_subscription.amount_cents, v_settings.initial_subscription_amount_cents);

    if v_amount_cents is null or v_paid_at is null then
      v_event_status := 'pending_review';
      v_error_code := 'incomplete_payment_event';
    elsif v_amount_cents <> v_expected_amount then
      v_event_status := 'pending_review';
      v_error_code := 'amount_mismatch';
    else
        if v_subscription.id is null then
          if v_whatsapp is null or v_full_name is null then
            v_event_status := 'pending_review';
            v_error_code := 'missing_identity';
          else
            if v_user.id is not null and v_user.is_active = false then
              update public.users
              set is_active = true,
                  deactivated_at = null,
                  full_name = coalesce(v_full_name, full_name)
              where id = v_user.id
              returning * into v_user;

              v_reactivated_user := true;
            elsif v_user.id is null then
              insert into public.users (full_name, whatsapp, is_active, deactivated_at)
              values (v_full_name, v_whatsapp, true, null)
              returning * into v_user;
            end if;

          v_next_billing_date := (v_paid_at::date + interval '1 month')::date;

          insert into public.subscriptions (
            user_id,
            plan,
            amount_cents,
            currency,
            status,
            start_date,
            next_billing_date,
            source
          )
          values (
            v_user.id,
            v_plan,
            v_settings.initial_subscription_amount_cents,
            'USD',
            'activa',
            v_paid_at::date,
            v_next_billing_date,
            v_source
          )
          on conflict (user_id) do update
          set amount_cents = excluded.amount_cents,
              status = excluded.status,
              next_billing_date = excluded.next_billing_date,
              source = excluded.source
          returning * into v_subscription;
        end if;
      else
        if v_user.id is not null and v_user.is_active = false then
          update public.users
          set is_active = true,
              deactivated_at = null,
              full_name = coalesce(v_full_name, full_name)
          where id = v_user.id
          returning * into v_user;

          v_reactivated_user := true;
        end if;

        if v_subscription.status in ('gracia', 'suspendida', 'terminada') then
          v_next_billing_date := (v_paid_at::date + interval '1 month')::date;
        elsif v_subscription.next_billing_date is null then
          v_event_status := 'pending_review';
          v_error_code := 'missing_subscription_cycle';
        else
          v_next_billing_date := (v_subscription.next_billing_date + interval '1 month')::date;
        end if;

        if v_event_status = 'processed' then
          update public.subscriptions
          set status = 'activa',
              next_billing_date = v_next_billing_date,
              source = v_source
          where id = v_subscription.id
          returning * into v_subscription;
        end if;
      end if;

      if v_event_status = 'processed' and v_subscription.id is not null and v_user.id is not null then
        insert into public.payments (
          subscription_id,
          user_id,
          event_id,
          amount_cents,
          currency,
          status,
          paid_at,
          due_at,
          source,
          external_ref
        )
        values (
          v_subscription.id,
          v_user.id,
          v_event_id,
          v_amount_cents,
          'USD',
          'paid',
          v_paid_at,
          coalesce(v_subscription.next_billing_date, v_paid_at::date),
          v_source,
          null
        )
        on conflict (event_id) do nothing
        returning * into v_payment;
      end if;
    end if;
    elsif v_event_type = 'payment_failed' or v_event_type = 'payment_refunded' then
      if v_subscription.id is null or v_user.id is null or v_amount_cents is null then
        v_event_status := 'pending_review';
        v_error_code := 'missing_financial_context';
      else
        insert into public.payments (
        subscription_id,
        user_id,
        event_id,
        amount_cents,
        currency,
        status,
        paid_at,
        due_at,
        source,
        external_ref
      )
      values (
        v_subscription.id,
        v_user.id,
        v_event_id,
        v_amount_cents,
        'USD',
        case when v_event_type = 'payment_failed' then 'failed' else 'refunded' end,
        v_paid_at,
        coalesce(v_subscription.next_billing_date, current_date),
        v_source,
        null
      )
        on conflict (event_id) do nothing
        returning * into v_payment;
      end if;
    elsif v_event_type = 'subscription_cancelled' then
      if v_subscription.id is null then
        v_event_status := 'rejected';
        v_error_code := 'subscription_not_found';
      elsif v_subscription.status = 'terminada' then
        v_event_status := 'ignored';
      else
        update public.subscriptions
        set status = 'terminada',
            next_billing_date = null,
            source = v_source
        where id = v_subscription.id
        returning * into v_subscription;
      end if;
    elsif v_event_type = 'manual_status_change' then
      if v_subscription.id is null then
        v_event_status := 'rejected';
        v_error_code := 'subscription_not_found';
      elsif v_target_status is null then
        v_event_status := 'rejected';
        v_error_code := 'target_status_required';
      elsif v_subscription.status = v_target_status then
        v_event_status := 'ignored';
      elsif (
        (v_subscription.status = 'activa' and v_target_status in ('gracia', 'suspendida', 'terminada')) or
        (v_subscription.status = 'gracia' and v_target_status in ('activa', 'suspendida', 'terminada')) or
        (v_subscription.status = 'suspendida' and v_target_status in ('activa', 'terminada'))
      ) then
        update public.subscriptions
        set status = v_target_status,
            next_billing_date = case when v_target_status = 'terminada' then null else next_billing_date end,
            source = v_source
        where id = v_subscription.id
        returning * into v_subscription;
      else
        v_event_status := 'rejected';
        v_error_code := 'invalid_transition';
      end if;
    elsif v_event_type = 'account_deleted' then
      if v_user.id is null and v_subscription.user_id is not null then
        select * into v_user from public.users where id = v_subscription.user_id limit 1;
      end if;

      if v_user.id is null then
        v_event_status := 'rejected';
        v_error_code := 'user_not_found';
      else
        update public.users
        set is_active = false,
            deactivated_at = now()
        where id = v_user.id
        returning * into v_user;

        if v_subscription.id is not null then
          update public.subscriptions
          set status = 'terminada',
              next_billing_date = null,
              source = v_source
          where id = v_subscription.id
          returning * into v_subscription;
        end if;
      end if;
    else
      v_event_status := 'rejected';
      v_error_code := 'unsupported_event_type';
    end if;

    update public.subscription_events
    set subscription_id = coalesce(v_subscription.id, subscription_id),
        user_id = coalesce(v_user.id, user_id),
        status = v_event_status,
        error_code = v_error_code,
        processed_at = now(),
        metadata = subscription_events.metadata || jsonb_strip_nulls(jsonb_build_object(
          'duplicate', v_duplicate,
          'target_status', v_target_status,
          'reactivated_user', case when v_reactivated_user then true else null end
        ))
    where id = v_event_id
    returning * into v_event;

    return jsonb_build_object(
      'duplicate', v_duplicate,
      'event', to_jsonb(v_event),
      'subscription', to_jsonb(v_subscription),
      'payment', to_jsonb(v_payment),
      'user', to_jsonb(v_user)
    );
  exception
    when others then
      insert into public.subscription_events as subscription_events (
        id,
        idempotency_key,
        event_type,
        source,
        subscription_id,
        user_id,
        amount_cents,
        currency,
        occurred_at,
        paid_at,
        status,
        error_code,
        metadata,
        processed_at
      )
      values (
        v_event_id,
        event_payload->>'idempotency_key',
        v_event_type,
        v_source,
        v_subscription.id,
        v_user.id,
        v_amount_cents,
        v_currency,
        v_occurred_at,
        v_paid_at,
        'rejected',
        coalesce(v_error_code, sqlstate),
        v_metadata || jsonb_strip_nulls(jsonb_build_object(
          'duplicate', v_duplicate,
          'target_status', v_target_status,
          'reactivated_user', case when v_reactivated_user then true else null end,
          'statement_error', sqlstate
        )),
        now()
      )
      on conflict (idempotency_key) do update
      set subscription_id = coalesce(excluded.subscription_id, subscription_events.subscription_id),
          user_id = coalesce(excluded.user_id, subscription_events.user_id),
          status = 'rejected',
          error_code = excluded.error_code,
          processed_at = excluded.processed_at,
          metadata = subscription_events.metadata || excluded.metadata;

      select * into v_event from public.subscription_events where id = v_event_id;

      return jsonb_build_object(
        'duplicate', v_duplicate,
        'event', to_jsonb(v_event),
        'subscription', to_jsonb(v_subscription),
        'payment', to_jsonb(v_payment),
        'user', to_jsonb(v_user)
      );
  end;
end;
$$;

alter table public.subscription_events enable row level security;

revoke insert, update on table public.subscription_events from authenticated;
grant select on table public.subscription_events to authenticated;
revoke all on function public.apply_subscription_event(jsonb) from public;
revoke all on function public.apply_subscription_event(jsonb) from anon;
revoke all on function public.apply_subscription_event(jsonb) from authenticated;
grant execute on function public.apply_subscription_event(jsonb) to service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subscription_events'
      and policyname = 'subscription_events_select_active_admin'
  ) then
    create policy subscription_events_select_active_admin
      on public.subscription_events
      for select
      to authenticated
      using (public.is_active_admin());
  end if;

end
$$;

commit;
