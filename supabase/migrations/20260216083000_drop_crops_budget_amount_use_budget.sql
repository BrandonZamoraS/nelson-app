begin;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'crops'
      and column_name = 'budget_amount'
  ) then
    update public.crops
    set budget = coalesce(budget, budget_amount::real)
    where budget_amount is not null;
  end if;
end $$;

alter table public.crops
  drop constraint if exists crops_budget_positive;

alter table public.crops
  add constraint crops_budget_positive
  check (budget is null or budget > 0);

alter table public.crops
  drop constraint if exists crops_budget_amount_positive;

alter table public.crops
  drop column if exists budget_amount;

commit;
