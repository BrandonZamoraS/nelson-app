-- Remove timezone and date_format columns from app_settings
-- These fields are no longer needed as per system requirements simplification

alter table public.app_settings
  drop column if exists timezone;

alter table public.app_settings
  drop column if exists date_format;

-- Remove associated constraints
alter table public.app_settings
  drop constraint if exists app_settings_timezone_not_blank;

alter table public.app_settings
  drop constraint if exists app_settings_date_format_not_blank;
