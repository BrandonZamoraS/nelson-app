-- Add crop budget and enforce positive values when present.
alter table public.crops
  add column if not exists budget real;

alter table public.crops
  drop constraint if exists crops_budget_positive;

alter table public.crops
  add constraint crops_budget_positive check (budget is null or budget > 0);
