begin;

alter table public.crops
  add column if not exists budget_amount numeric;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'crops'
      and column_name = 'budget'
  ) then
    update public.crops
    set budget_amount = budget::numeric
    where budget_amount is null
      and budget is not null;
  end if;
end $$;

alter table public.crops
  drop constraint if exists crops_budget_amount_positive;

alter table public.crops
  add constraint crops_budget_amount_positive
  check (budget_amount is null or budget_amount > 0);

commit;
