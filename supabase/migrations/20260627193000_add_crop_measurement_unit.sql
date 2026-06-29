-- Add immutable crop measurement unit with a kg default.
alter table public.crops
  add column if not exists measurement_unit text not null default 'kg';

update public.crops
set measurement_unit = 'kg'
where measurement_unit is null;

alter table public.crops
  alter column measurement_unit set default 'kg';

alter table public.crops
  alter column measurement_unit set not null;

alter table public.crops
  drop constraint if exists crops_measurement_unit_not_blank;

alter table public.crops
  add constraint crops_measurement_unit_not_blank check (char_length(btrim(measurement_unit)) between 1 and 32);

create or replace function public.prevent_crop_measurement_unit_change()
returns trigger
language plpgsql
as $$
begin
  if old.measurement_unit is distinct from new.measurement_unit then
    raise exception 'measurement_unit is immutable';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_crop_measurement_unit_change on public.crops;

create trigger prevent_crop_measurement_unit_change
before update on public.crops
for each row
execute function public.prevent_crop_measurement_unit_change();
