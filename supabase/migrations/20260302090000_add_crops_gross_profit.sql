-- Add crop gross profit and enforce non-negative values when present.
alter table public.crops
  add column if not exists gross_profit real;

alter table public.crops
  drop constraint if exists crops_gross_profit_non_negative;

alter table public.crops
  add constraint crops_gross_profit_non_negative check (gross_profit is null or gross_profit >= 0);
