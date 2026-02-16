begin;

-- Fix type mismatch: public.crops.id is bigint, but public.expenses.crop_id was created as smallint.
-- Keep it idempotent to avoid breaking environments where it was already fixed manually.
do $$
declare
  col_type text;
begin
  select data_type
    into col_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'expenses'
    and column_name = 'crop_id';

  if col_type = 'smallint' then
    alter table public.expenses drop constraint if exists expenses_crop_id_fkey;
    alter table public.expenses
      alter column crop_id type bigint
      using crop_id::bigint;

    alter table public.expenses
      add constraint expenses_crop_id_fkey
      foreign key (crop_id)
      references public.crops(id)
      on update cascade
      on delete cascade;
  end if;
end $$;

commit;

